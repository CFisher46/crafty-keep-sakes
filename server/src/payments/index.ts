import { createMockProvider } from './mockProvider';
import type { PaymentProvider } from './types';

export const PAYMENT_CURRENCY = 'GBP';

export const getClientUrl = (): string =>
  (process.env.CLIENT_URL || (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',')[0]).replace(/\/$/, '');

// PAYMENTS_PROVIDER: unset = payments off (checkout only creates an unpaid invoice), mock, or square (not built yet).
export const getPaymentProviderName = (): string => (process.env.PAYMENTS_PROVIDER || '').trim().toLowerCase();

export const isPaymentsEnabled = (): boolean => getPaymentProviderName() !== '';

export const getPaymentProvider = (): PaymentProvider => {
  const name = getPaymentProviderName();

  if (name === 'mock') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('The mock payment provider cannot be used in production');
    }
    return createMockProvider(getClientUrl());
  }

  if (name === 'square') {
    throw new Error('The Square payment provider is not implemented yet');
  }

  throw new Error('Payments are not enabled');
};
