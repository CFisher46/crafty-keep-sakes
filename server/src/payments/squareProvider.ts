import crypto from 'crypto';
import type { PaymentEvent, PaymentEventStatus, PaymentProvider } from './types';

export const SQUARE_SIGNATURE_HEADER = 'x-square-hmacsha256-signature';

const SQUARE_VERSION = '2025-01-23';

export type SquareConfig = {
  accessToken: string;
  locationId: string;
  webhookSignatureKey: string;
  webhookUrl: string;
  environment: 'sandbox' | 'production';
};

export const readSquareConfig = (env: NodeJS.ProcessEnv = process.env): SquareConfig => {
  const config = {
    accessToken: (env.SQUARE_ACCESS_TOKEN || '').trim(),
    locationId: (env.SQUARE_LOCATION_ID || '').trim(),
    webhookSignatureKey: (env.SQUARE_WEBHOOK_SIGNATURE_KEY || '').trim(),
    webhookUrl: (env.SQUARE_WEBHOOK_URL || '').trim(),
    environment: (env.SQUARE_ENVIRONMENT || 'sandbox').trim().toLowerCase() === 'production' ? 'production' : 'sandbox',
  } as SquareConfig;

  const missing = [
    ['SQUARE_ACCESS_TOKEN', config.accessToken],
    ['SQUARE_LOCATION_ID', config.locationId],
    ['SQUARE_WEBHOOK_SIGNATURE_KEY', config.webhookSignatureKey],
    ['SQUARE_WEBHOOK_URL', config.webhookUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Square is not configured. Missing: ${missing.join(', ')}`);
  }

  return config;
};

const baseUrl = (environment: SquareConfig['environment']) =>
  environment === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';

// Square signs the notification URL followed by the raw body with the subscription's signature key.
export const computeSquareSignature = (signatureKey: string, notificationUrl: string, rawBody: Buffer | string): string =>
  crypto.createHmac('sha256', signatureKey).update(notificationUrl).update(rawBody).digest('base64');

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const mapStatus = (status: unknown): PaymentEventStatus => {
  switch (String(status).toUpperCase()) {
    case 'COMPLETED':
      return 'succeeded';
    case 'FAILED':
    case 'CANCELED':
      return 'failed';
    default:
      return 'pending';
  }
};

type FetchLike = typeof fetch;

export const createSquareProvider = (config: SquareConfig, fetchImpl: FetchLike = fetch): PaymentProvider => ({
  name: 'square',

  async createPaymentLink({ invoiceId, invoiceNumber, amount, currency, redirectUrl }) {
    const response = await fetchImpl(`${baseUrl(config.environment)}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_VERSION,
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        quick_pay: {
          name: `Crafty Keepsakes invoice ${invoiceNumber}`,
          price_money: { amount: Math.round(amount * 100), currency },
          location_id: config.locationId,
        },
        checkout_options: { redirect_url: redirectUrl },
        payment_note: `Invoice ${invoiceNumber} (#${invoiceId})`,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as { payment_link?: { url?: string; order_id?: string }; errors?: unknown };
    const link = body?.payment_link;

    if (!response.ok || !link?.url || !link?.order_id) {
      // Log Square's error detail server-side only; never return it to the customer
      console.error('Square payment link error:', response.status, JSON.stringify(body?.errors ?? body));
      throw new Error('Square could not create the payment link');
    }

    // A Square payment carries its order id, which is how the webhook finds this invoice.
    return { providerRef: String(link.order_id), url: String(link.url) };
  },

  parseWebhook(rawBody, headers) {
    const signature = headers[SQUARE_SIGNATURE_HEADER];
    const expected = computeSquareSignature(config.webhookSignatureKey, config.webhookUrl, rawBody);

    if (typeof signature !== 'string' || !safeEqual(signature, expected)) {
      return null;
    }

    try {
      const body = JSON.parse(rawBody.toString('utf8'));
      const payment = body?.data?.object?.payment;

      // Only payment events are handled; anything else is a valid, ignorable event.
      if (!body?.event_id || !payment?.order_id) {
        return null;
      }

      const minorUnits = payment.amount_money?.amount;

      return {
        eventId: String(body.event_id),
        type: String(body.type ?? 'payment.updated'),
        providerRef: String(payment.order_id),
        status: mapStatus(payment.status),
        amount: typeof minorUnits === 'number' ? minorUnits / 100 : undefined,
        currency: payment.amount_money?.currency,
      } as PaymentEvent;
    } catch {
      return null;
    }
  },
});
