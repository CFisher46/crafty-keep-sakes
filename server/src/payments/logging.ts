import crypto from 'crypto';

type PaymentLogFields = Record<string, string | number | boolean | null>;

export const paymentReference = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);

export const warnPayment = (reason: string, fields: PaymentLogFields = {}): void => {
  console.warn(`[payments] ${JSON.stringify({ reason, ...fields })}`);
};
