import crypto from 'crypto';
import type { PaymentEvent, PaymentProvider } from './types';

export const MOCK_SIGNATURE_HEADER = 'x-mock-signature';

const MOCK_SECRET = process.env.PAYMENTS_MOCK_SECRET || 'mock-webhook-secret';

const sign = (body: Buffer | string): string =>
  crypto.createHmac('sha256', MOCK_SECRET).update(body).digest('hex');

export const signMockPayload = sign;

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// Stands in for Square until credentials exist. The client hosts a fake payment page
// at /payments/mock, and its result is delivered through the same event path as a real webhook.
export const createMockProvider = (clientUrl: string): PaymentProvider => ({
  name: 'mock',

  async createPaymentLink({ invoiceId }) {
    const providerRef = `mock_${crypto.randomBytes(8).toString('hex')}`;
    const query = new URLSearchParams({ ref: providerRef, invoice: String(invoiceId) });
    return { providerRef, url: `${clientUrl}/payments/mock?${query.toString()}` };
  },

  parseWebhook(rawBody, headers) {
    const signature = headers[MOCK_SIGNATURE_HEADER];
    if (typeof signature !== 'string' || !safeEqual(signature, sign(rawBody))) {
      return null;
    }

    try {
      const body = JSON.parse(rawBody.toString('utf8'));
      if (!body?.eventId || !body?.providerRef || !body?.status) {
        return null;
      }
      return {
        eventId: String(body.eventId),
        type: String(body.type ?? 'payment.updated'),
        providerRef: String(body.providerRef),
        status: body.status,
        amount: body.amount === undefined ? undefined : Number(body.amount),
        currency: body.currency,
      } as PaymentEvent;
    } catch {
      return null;
    }
  },
});
