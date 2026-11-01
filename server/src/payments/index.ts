import { createMockProvider } from './mockProvider';
import { createSquareProvider, readSquareConfig } from './squareProvider';
import type { PaymentProvider } from './types';

export const PAYMENT_CURRENCY = 'GBP';

export const getClientUrl = (): string =>
  (process.env.CLIENT_URL || (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',')[0]).replace(/\/$/, '');

// PAYMENTS_PROVIDER: unset = payments off (checkout only creates an unpaid invoice), mock (dev only) or square.
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
    return createSquareProvider(readSquareConfig());
  }

  throw new Error('Payments are not enabled');
};
