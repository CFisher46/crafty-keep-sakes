import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvoiceDetailsDialog from './invoice-details';

// Grommet's Layer portals and leaves clones behind, so render it inline for predictable queries
jest.mock('grommet', () => ({
  ...jest.requireActual('grommet'),
  Layer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const invoice = {
  id: 90,
  order_id: 10,
  invoice_number: 'INV-001',
  invoice_status: 'unpaid',
  total_due: 25.5,
  issued_at: '2026-08-15 10:00:00',
  user_id: 5,
  tracking_info: '',
};

const address = { address_line1: '', address_line2: '', address_line3: '', town: '', county: '', postcode: '' };

const renderDialog = (onSave: jest.Mock) => {
  render(
    <InvoiceDetailsDialog
      invoice={invoice}
      billingAddress={address}
      userType="admin"
      updateMessage={null}
      onClose={jest.fn()}
      onSave={onSave}
    />
  );
};

describe('InvoiceDetailsDialog', () => {
  it('has a single save button that is disabled until something changes', () => {
    renderDialog(jest.fn());

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.queryByText('Confirm Update')).not.toBeInTheDocument();
    expect(screen.queryByText('Update Tracking Info')).not.toBeInTheDocument();
  });

  it('saves a tracking-only change without touching the status', () => {
    const onSave = jest.fn();
    renderDialog(onSave);

    fireEvent.change(screen.getByPlaceholderText('No Tracking Available'), { target: { value: 'RM777' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave).toHaveBeenCalledWith({ trackingInfo: 'RM777' });
  });

  it('saves status and tracking together in one call', () => {
    const onSave = jest.fn();
    renderDialog(onSave);

    fireEvent.change(screen.getByPlaceholderText('No Tracking Available'), { target: { value: 'RM777' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open Drop; Selected: unpaid' }));
    fireEvent.click(screen.getByText('paid'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ status: 'paid', trackingInfo: 'RM777' });
  });

  describe('paying an unpaid invoice', () => {
    const renderAs = (userType: string, status = 'unpaid') =>
      render(
        <InvoiceDetailsDialog
          invoice={{ ...invoice, invoice_status: status }}
          billingAddress={address}
          userType={userType}
          updateMessage={null}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

    it('lets a customer start payment and sends them to the payment page', async () => {
      const assign = jest.fn();
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = { ...originalLocation, assign };

      try {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ payment_url: 'https://pay.example/abc' }),
        }) as any;
        renderAs('customer');

        fireEvent.click(screen.getByRole('button', { name: 'Pay now' }));

        await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/abc'));
        expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('/payments/invoices/90/pay');
      } finally {
        (window as any).location = originalLocation;
      }
    });

    it('shows the error when payment cannot be started', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Payments are not enabled' }),
      }) as any;
      renderAs('customer');

      fireEvent.click(screen.getByRole('button', { name: 'Pay now' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Payments are not enabled');
      expect(screen.getByRole('button', { name: 'Pay now' })).toBeEnabled();
    });

    it('does not offer payment for paid invoices or to admins', () => {
      const { unmount } = renderAs('customer', 'paid');
      expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
      unmount();

      renderAs('admin');
      expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
    });
  });
});
