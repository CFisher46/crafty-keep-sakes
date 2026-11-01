import express from 'express';
import { RowDataPacket } from 'mysql2';
import { db } from '../../ts-common/database';
import { verifyAuthToken } from '../../ts-common/middleware';
import { getPaymentProvider, getPaymentProviderName, isPaymentsEnabled } from '../../payments';
import { signMockPayload, MOCK_SIGNATURE_HEADER } from '../../payments/mockProvider';
import { createPaymentForInvoice, processPaymentEvent } from '../../payments/service';

const router = express.Router();

type AuthenticatedUser = { id?: string | number; type?: string };

const getUser = (req: express.Request): { id: number; isAdmin: boolean } => {
  const user = (req as express.Request & { user?: AuthenticatedUser | string }).user;
  const id = typeof user === 'object' && user ? Number(user.id) : NaN;

  if (!Number.isFinite(id)) {
    throw new Error('Invalid authenticated user');
  }

  return { id, isAdmin: String((user as AuthenticatedUser).type || '').toLowerCase() === 'admin' };
};

const readInvoice = async (invoiceId: number) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT i.id, i.invoice_number, i.invoice_status, i.total_due, o.user_id
     FROM invoices_v2 i
     JOIN orders_v2 o ON o.id = i.order_id
     WHERE i.id = ?
     LIMIT 1`,
    [invoiceId]
  );
  return rows[0] ?? null;
};

// Called by the payment vendor, so there is no login. The signature is the only authentication.
// app.ts parses this route as a raw body so the signature can be checked against the exact bytes.
router.post('/webhook', async (req, res) => {
  console.log('POST /api/v2/payments/webhook');

  if (!isPaymentsEnabled()) {
    res.status(404).json({ error: 'Payments are not enabled' });
    return;
  }

  try {
    const provider = getPaymentProvider();
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const event = provider.parseWebhook(rawBody, req.headers);

    if (!event) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const outcome = await processPaymentEvent(provider.name, event);
    // Always acknowledge a valid event so the vendor does not keep retrying duplicates.
    res.json({ received: true, outcome });
  } catch (err) {
    console.error('Payment Webhook Error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.get('/status/:invoiceId', verifyAuthToken, async (req, res) => {
  console.log(`GET /api/v2/payments/status/${req.params.invoiceId}`);

  try {
    const { id: userId, isAdmin } = getUser(req);
    const invoice = await readInvoice(Number(req.params.invoiceId));

    if (!invoice || (!isAdmin && Number(invoice.user_id) !== userId)) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const [payments] = await db.query<RowDataPacket[]>(
      `SELECT payment_status FROM payments_v2 WHERE invoice_id = ? ORDER BY id DESC LIMIT 1`,
      [invoice.id]
    );

    res.json({
      invoice_id: Number(invoice.id),
      invoice_number: invoice.invoice_number,
      invoice_status: invoice.invoice_status,
      total_due: Number(invoice.total_due),
      payment_status: payments[0]?.payment_status ?? null,
      payments_enabled: isPaymentsEnabled(),
    });
  } catch (err) {
    console.error('Payment Status Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Starts (or restarts) payment for an unpaid invoice, e.g. after an abandoned or failed attempt.
router.post('/invoices/:id/pay', verifyAuthToken, async (req, res) => {
  console.log(`POST /api/v2/payments/invoices/${req.params.id}/pay`);

  if (!isPaymentsEnabled()) {
    res.status(400).json({ error: 'Payments are not enabled' });
    return;
  }

  try {
    const { id: userId } = getUser(req);
    const invoice = await readInvoice(Number(req.params.id));

    if (!invoice || Number(invoice.user_id) !== userId) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.invoice_status !== 'unpaid') {
      res.status(400).json({ error: 'Invoice is not awaiting payment' });
      return;
    }

    const paymentUrl = await createPaymentForInvoice({
      invoiceId: Number(invoice.id),
      invoiceNumber: String(invoice.invoice_number),
      amount: Number(invoice.total_due),
    });

    res.json({ payment_url: paymentUrl });
  } catch (err) {
    console.error('Start Payment Error:', err);
    res.status(500).json({ error: 'Could not start payment' });
  }
});

// Mock provider only: simulates the vendor's hosted page and webhook. It signs an event
// and runs it through the same verification and processing as a real webhook.
router.post('/mock/:ref/complete', verifyAuthToken, async (req, res) => {
  console.log(`POST /api/v2/payments/mock/${req.params.ref}/complete`);

  if (getPaymentProviderName() !== 'mock') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    const { id: userId, isAdmin } = getUser(req);
    const outcome = req.body?.outcome === 'failed' ? 'failed' : 'succeeded';

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT i.total_due, o.user_id
       FROM payments_v2 p
       JOIN invoices_v2 i ON i.id = p.invoice_id
       JOIN orders_v2 o ON o.id = i.order_id
       WHERE p.provider = 'mock' AND p.provider_ref = ? AND p.event_type = 'payment_link_created'
       LIMIT 1`,
      [req.params.ref]
    );

    const link = rows[0];
    if (!link || (!isAdmin && Number(link.user_id) !== userId)) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const body = Buffer.from(
      JSON.stringify({
        eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'payment.updated',
        providerRef: req.params.ref,
        status: outcome,
        amount: Number(link.total_due),
        currency: 'GBP',
      })
    );

    const provider = getPaymentProvider();
    const event = provider.parseWebhook(body, { [MOCK_SIGNATURE_HEADER]: signMockPayload(body) });
    if (!event) {
      res.status(500).json({ error: 'Could not build mock event' });
      return;
    }

    res.json({ outcome: await processPaymentEvent(provider.name, event) });
  } catch (err) {
    console.error('Mock Payment Error:', err);
    res.status(500).json({ error: 'Mock payment failed' });
  }
});

export default router;
