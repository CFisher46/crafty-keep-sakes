import type { IncomingHttpHeaders } from 'http';

export type PaymentEventStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

// A vendor-neutral payment event. Each provider maps its own webhook payload to this shape.
export type PaymentEvent = {
  eventId: string;
  type: string;
  // The vendor's reference stored on payments_v2.provider_ref when the payment link is created.
  providerRef: string;
  status: PaymentEventStatus;
  amount?: number;
  currency?: string;
};

export type CreatePaymentLinkInput = {
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  redirectUrl: string;
};

export type PaymentLink = {
  providerRef: string;
  url: string;
};

export interface PaymentProvider {
  readonly name: string;
  createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLink>;
  // Returns the event, or null when the signature or payload is invalid.
  parseWebhook(rawBody: Buffer, headers: IncomingHttpHeaders): PaymentEvent | null;
}
