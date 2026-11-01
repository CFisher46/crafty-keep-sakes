import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../ts-common/database';
import { insertAuditEvent } from '../routes/v2/audit-events';
import { notify } from '../notifications/service';
import { getClientUrl, getPaymentProvider, PAYMENT_CURRENCY } from './index';
import type { PaymentEvent } from './types';

export type PaymentOutcome =
  | 'paid'
  | 'failed'
  | 'recorded'
  | 'duplicate'
  | 'unknown_payment'
  | 'amount_mismatch';

// payments_v2.event_type is VARCHAR(80); the vendor event id makes each event idempotent.
const toEventKey = (event: PaymentEvent): string => `${event.type}:${event.eventId}`.slice(0, 80);

/**
 * Creates a hosted payment link for an invoice and records it as a pending payment.
 * The provider reference stored here is how a later webhook finds its invoice.
 */
export async function createPaymentForInvoice(invoice: {
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
}): Promise<string> {
  const provider = getPaymentProvider();
  const link = await provider.createPaymentLink({
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.amount,
    currency: PAYMENT_CURRENCY,
    redirectUrl: `${getClientUrl()}/payments/result?invoice=${invoice.invoiceId}`,
  });

  await db.query(
    `INSERT INTO payments_v2 (invoice_id, provider, provider_ref, amount, payment_status, event_type)
     VALUES (?, ?, ?, ?, 'pending', 'payment_link_created')`,
    [invoice.invoiceId, provider.name, link.providerRef, invoice.amount]
  );

  return link.url;
}

/**
 * Applies a verified payment event: records it once, and on success marks the invoice
 * paid and the order placed. Safe to call repeatedly with the same event.
 */
export async function processPaymentEvent(providerName: string, event: PaymentEvent): Promise<PaymentOutcome> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [linkRows] = await connection.query<RowDataPacket[]>(
      `SELECT p.invoice_id, i.invoice_number, i.invoice_status, i.total_due, o.id AS order_id, o.user_id
       FROM payments_v2 p
       JOIN invoices_v2 i ON i.id = p.invoice_id
       JOIN orders_v2 o ON o.id = i.order_id
       WHERE p.provider = ? AND p.provider_ref = ? AND p.event_type = 'payment_link_created'
       LIMIT 1`,
      [providerName, event.providerRef]
    );

    const link = linkRows[0];
    if (!link) {
      await connection.rollback();
      return 'unknown_payment';
    }

    const eventKey = toEventKey(event);
    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM payments_v2 WHERE provider = ? AND provider_ref = ? AND event_type = ? LIMIT 1`,
      [providerName, event.providerRef, eventKey]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return 'duplicate';
    }

    const invoiceId = Number(link.invoice_id);
    const orderId = Number(link.order_id);
    const customerId = Number(link.user_id);
    const invoiceNumber = String(link.invoice_number);
    const totalDue = Number(link.total_due);
    const amount = event.amount ?? totalDue;
    const amountMatches = Math.abs(amount - totalDue) < 0.005;

    // Never mark an invoice paid for the wrong amount; record the event for an admin to review.
    const recordedStatus = event.status === 'succeeded' && !amountMatches ? 'failed' : event.status;

    await connection.query<ResultSetHeader>(
      `INSERT INTO payments_v2 (invoice_id, provider, provider_ref, amount, payment_status, event_type, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        providerName,
        event.providerRef,
        amount,
        recordedStatus,
        eventKey,
        JSON.stringify({ eventId: event.eventId, currency: event.currency ?? null, amountMatches }),
      ]
    );

    let outcome: PaymentOutcome = 'recorded';

    if (event.status === 'succeeded' && !amountMatches) {
      outcome = 'amount_mismatch';
    } else if (event.status === 'succeeded' && link.invoice_status !== 'paid') {
      await connection.query(
        `UPDATE invoices_v2 SET invoice_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [invoiceId]
      );
      await connection.query(
        `UPDATE orders_v2 SET order_status = 'placed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [orderId]
      );
      await insertAuditEvent(connection, {
        actorUserId: null,
        actorRole: 'system',
        actionType: 'UPDATE',
        resourceType: 'invoices_v2',
        resourceId: invoiceId,
        sourceEndpoint: 'POST /api/v2/payments/webhook',
        oldValuesJson: { invoice_status: link.invoice_status },
        newValuesJson: { invoice_status: 'paid', provider: providerName, provider_ref: event.providerRef },
      });
      outcome = 'paid';
    } else if (event.status === 'failed') {
      outcome = 'failed';
    }

    await connection.commit();

    if (outcome === 'paid') {
      await notify('order_placed', { orderId, invoiceId, invoiceNumber, totalDue });
      await notify('invoice_status_changed', {
        userId: customerId,
        orderId,
        invoiceId,
        invoiceNumber,
        status: 'paid',
      });
    } else if (outcome === 'failed') {
      await notify('payment_failed', { userId: customerId, orderId, invoiceId, invoiceNumber });
    }

    return outcome;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
