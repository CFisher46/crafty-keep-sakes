import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import RecentInvoicesTile from './RecentInvoicesTile';
import authReducer from '../../../store/auth/authSlice';
import basketReducer from '../../../store/basket/basketSlice';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

const buildStore = () =>
  configureStore({
    reducer: combineReducers({ auth: authReducer, basket: basketReducer }),
  });

const makeOrder = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  user_id: 5,
  order_status: 'placed',
  grand_total: 10,
  invoice_id: 100 + id,
  invoice_number: `INV-${id}`,
  has_changes: true,
  placed_at: '2026-08-01 10:00:00',
  invoice_updated_at: `2026-08-${String(10 + id).padStart(2, '0')} 10:00:00`,
  ...overrides,
});

const mockOrders = (orders: unknown[]) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => orders }) as any;
};

describe('RecentInvoicesTile', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('lists only changed invoices, newest first, capped at five', async () => {
    mockOrders([
      ...[1, 2, 3, 4, 5, 6].map((id) => makeOrder(id)),
      makeOrder(7, { has_changes: false }),
    ]);

    render(
      <Provider store={buildStore()}>
        <RecentInvoicesTile isAdmin={false} />
      </Provider>
    );

    await screen.findByText('INV-6');
    expect(screen.queryByText('INV-7')).not.toBeInTheDocument();
    expect(screen.queryByText('INV-1')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('INV-6');
  });

  it('shows a caught-up message when nothing has changed', async () => {
    mockOrders([makeOrder(1, { has_changes: false })]);

    render(
      <Provider store={buildStore()}>
        <RecentInvoicesTile isAdmin={false} />
      </Provider>
    );

    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
  });

  it('uses the all-orders endpoint and invoices page for admins', async () => {
    mockOrders([makeOrder(1, { customer_name: 'Ada Lovelace' })]);

    render(
      <Provider store={buildStore()}>
        <RecentInvoicesTile isAdmin />
      </Provider>
    );

    fireEvent.click(await screen.findByText('INV-1'));
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('/orders/all');
    expect(mockNavigate).toHaveBeenCalledWith('/Reporting/invoices?invoice=101');
  });
});
