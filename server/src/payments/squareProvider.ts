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

const read = (env: NodeJS.ProcessEnv, name: string): string => (env[name] || '').trim();

/**
 * Resolves which Square environment to use and its credentials.
 *
 * - Outside NODE_ENV=production only the sandbox is ever used. Asking for production there is an
 *   error, so a developer's machine can never take real payments.
 * - In production, SQUARE_ENVIRONMENT must say "production" to go live; anything else stays on sandbox.
 * - Each environment reads its own SQUARE_SANDBOX_* / SQUARE_PRODUCTION_* credentials, so a sandbox
 *   token can never be sent to the live host. The unprefixed SQUARE_* names still work for sandbox.
 */
export const readSquareConfig = (env: NodeJS.ProcessEnv = process.env): SquareConfig => {
  const requested = read(env, 'SQUARE_ENVIRONMENT').toLowerCase();
  const isProductionRuntime = read(env, 'NODE_ENV').toLowerCase() === 'production';

  if (requested === 'production' && !isProductionRuntime) {
    throw new Error('Square production is only available when NODE_ENV=production; use the sandbox locally');
  }

  const environment: SquareConfig['environment'] = isProductionRuntime && requested === 'production' ? 'production' : 'sandbox';
  const prefix = environment === 'production' ? 'SQUARE_PRODUCTION_' : 'SQUARE_SANDBOX_';
  const pick = (name: string) =>
    read(env, `${prefix}${name}`) || (environment === 'sandbox' ? read(env, `SQUARE_${name}`) : '');

  const config: SquareConfig = {
    accessToken: pick('ACCESS_TOKEN'),
    locationId: pick('LOCATION_ID'),
    webhookSignatureKey: pick('WEBHOOK_SIGNATURE_KEY'),
    webhookUrl: read(env, 'SQUARE_WEBHOOK_URL'),
    environment,
  };

  const missing = [
    [`${prefix}ACCESS_TOKEN`, config.accessToken],
    [`${prefix}LOCATION_ID`, config.locationId],
    [`${prefix}WEBHOOK_SIGNATURE_KEY`, config.webhookSignatureKey],
    ['SQUARE_WEBHOOK_URL', config.webhookUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Square ${environment} is not configured. Missing: ${missing.join(', ')}`);
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
