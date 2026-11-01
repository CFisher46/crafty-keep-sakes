import { render, screen, fireEvent } from '@testing-library/react';
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
});
