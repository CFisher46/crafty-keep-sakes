import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MockPaymentPage from './mockPaymentPage';
import PaymentResultPage from './resultPage';

const mockNavigate = jest.fn();
let mockSearch = '';

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(mockSearch)],
  }),
  { virtual: true }
);

const status = (overrides: Record<string, unknown> = {}) => ({
  invoice_id: 90,
  invoice_number: 'INV-001',
  invoice_status: 'unpaid',
  total_due: 25,
  payment_status: 'pending',
  payments_enabled: true,
  ...overrides,
});

const respond = (body: unknown, ok = true) => ({ ok, json: async () => body });

describe('MockPaymentPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSearch = 'ref=mock_abc&invoice=90';
    global.fetch = jest.fn().mockResolvedValue(respond({ outcome: 'paid' })) as any;
  });

  it('completes a simulated payment then shows the result page', async () => {
    render(<MockPaymentPage />);

    fireEvent.click(screen.getByRole('button', { name: /Pay now/ }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/payments/result?invoice=90'));
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(url)).toContain('/payments/mock/mock_abc/complete');
    expect(JSON.parse(init.body)).toEqual({ outcome: 'succeeded' });
  });

  it('can simulate a failed payment', async () => {
    render(<MockPaymentPage />);

    fireEvent.click(screen.getByRole('button', { name: /failed payment/ }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual({ outcome: 'failed' });
  });

  it('shows the error and stays put when the server rejects it', async () => {
    global.fetch = jest.fn().mockResolvedValue(respond({ error: 'Payment not found' }, false)) as any;
    render(<MockPaymentPage />);

    fireEvent.click(screen.getByRole('button', { name: /Pay now/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Payment not found');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('rejects a link without a payment reference', () => {
    mockSearch = '';
    render(<MockPaymentPage />);
    expect(screen.getByText('This payment link is not valid.')).toBeInTheDocument();
  });
});

describe('PaymentResultPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSearch = 'invoice=90';
  });

  it('confirms a paid invoice', async () => {
    global.fetch = jest.fn().mockResolvedValue(respond(status({ invoice_status: 'paid', payment_status: 'succeeded' }))) as any;

    render(<PaymentResultPage />);

    expect(await screen.findByText('Payment received')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /again/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View my invoice' }));
    expect(mockNavigate).toHaveBeenCalledWith('/invoices?invoice=90');
  });

  it('offers to try again after a failed payment', async () => {
    global.fetch = jest.fn().mockResolvedValue(respond(status({ payment_status: 'failed' }))) as any;

    render(<PaymentResultPage />);

    expect(await screen.findByText('Payment unsuccessful')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try payment again' })).toBeInTheDocument();
  });

  it('keeps checking until the webhook marks the invoice paid', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(respond(status()))
      .mockResolvedValue(respond(status({ invoice_status: 'paid', payment_status: 'succeeded' }))) as any;

    render(<PaymentResultPage />);

    expect(await screen.findByText('Payment received', undefined, { timeout: 4000 })).toBeInTheDocument();
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('shows an error when the status cannot be loaded', async () => {
    global.fetch = jest.fn().mockResolvedValue(respond({ error: 'Invoice not found' }, false)) as any;

    render(<PaymentResultPage />);

    expect(await screen.findByText('We could not check your payment')).toBeInTheDocument();
    expect(screen.getByText('Invoice not found')).toBeInTheDocument();
  });
});
