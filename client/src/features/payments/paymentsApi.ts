import { buildApiUrl } from '../../api/apiPath';

export type PaymentStatus = {
  invoice_id: number;
  invoice_number: string;
  invoice_status: 'unpaid' | 'paid' | 'void';
  total_due: number;
  payment_status: 'pending' | 'succeeded' | 'failed' | 'refunded' | null;
  payments_enabled: boolean;
};

const request = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildApiUrl('payments', path), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || 'Payment request failed');
  }

  return body as T;
};

export const fetchPaymentStatus = (invoiceId: string) => request<PaymentStatus>(`/status/${encodeURIComponent(invoiceId)}`);

export const startPayment = (invoiceId: string) =>
  request<{ payment_url: string }>(`/invoices/${encodeURIComponent(invoiceId)}/pay`, { method: 'POST' });

// Mock provider only: stands in for the vendor's hosted page reporting the result.
export const completeMockPayment = (ref: string, outcome: 'succeeded' | 'failed') =>
  request<{ outcome: string }>(`/mock/${encodeURIComponent(ref)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ outcome }),
  });
