import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import MyInvoicesPage from './page';
import AllInvoicesPage from '../reporting/invoices/page';
import authReducer from '../../store/auth/authSlice';
import usersReducer from '../../store/users/usersSlice';
import basketReducer from '../../store/basket/basketSlice';

const mockNavigate = jest.fn();
let mockSearch = '';

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(mockSearch), jest.fn()],
  }),
  { virtual: true }
);

const rootReducer = combineReducers({ auth: authReducer, users: usersReducer, basket: basketReducer });

const buildStore = () =>
  configureStore({
    reducer: rootReducer,
    preloadedState: { auth: { isLoggedIn: true, user: { id: '5', type: 'customer' } } } as any,
  });

const order = {
  id: 10,
  user_id: 5,
  order_status: 'placed',
  grand_total: 25.5,
  invoice_id: 90,
  invoice_number: 'INV-001',
  tracking_info: 'RM123456',
  placed_at: '2026-08-15 10:00:00',
};

const invoice = {
  id: 90,
  order_id: 10,
  invoice_number: 'INV-001',
  invoice_status: 'unpaid',
  total_due: 25.5,
  issued_at: '2026-08-15 10:00:00',
  user_id: 5,
};

const mockApi = (orders: unknown[]) => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    const path = String(url);
    if (path.includes('/invoices/90')) return Promise.resolve({ ok: true, json: async () => invoice });
    if (path.includes('/orders')) return Promise.resolve({ ok: true, json: async () => orders });
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
};

describe('Invoice pages', () => {
  afterEach(() => jest.clearAllMocks());

  it('lists the signed-in customers own invoices without management controls', async () => {
    mockApi([order]);

    render(
      <Provider store={buildStore()}>
        <MyInvoicesPage />
      </Provider>
    );

    expect(screen.getByRole('heading', { name: 'My invoices' })).toBeInTheDocument();
    expect(await screen.findByText('INV-001')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Email' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByText('INV-001'));
    fireEvent.click(screen.getByText('Open Selected Invoice'));

    expect(await screen.findByText('Invoice id: INV-001')).toBeInTheDocument();
    expect(screen.getAllByText('RM123456').length).toBeGreaterThan(0);
    expect(screen.queryByText('Manage invoice')).not.toBeInTheDocument();
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/orders/all'))).toBe(false);
  });

  it('shows every customers invoices to admins with management controls', async () => {
    mockApi([{ ...order, customer_name: 'Ada Lovelace', customer_email: 'ada@example.com' }]);

    render(
      <Provider store={buildStore()}>
        <AllInvoicesPage />
      </Provider>
    );

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /Ada Lovelace/ });
    expect(within(row).getByRole('cell', { name: 'ada@example.com' })).toBeInTheDocument();
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/orders/all'))).toBe(true);

    fireEvent.click(screen.getByText('INV-001'));
    fireEvent.click(screen.getByText('Open Selected Invoice'));

    expect(await screen.findByText('Manage invoice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.queryByText('Confirm Update')).not.toBeInTheDocument();
    expect(screen.queryByText('Update Tracking Info')).not.toBeInTheDocument();
  });

  it('highlights changed invoices and clears the highlight once opened', async () => {
    mockApi([
      { ...order, has_changes: true },
      { ...order, id: 11, invoice_id: 91, invoice_number: 'INV-002', has_changes: false },
    ]);

    render(
      <Provider store={buildStore()}>
        <MyInvoicesPage />
      </Provider>
    );

    await screen.findByText('INV-002');
    expect(screen.getAllByText('Updated')).toHaveLength(1);

    fireEvent.click(screen.getByText('INV-001'));
    fireEvent.click(screen.getByText('Open Selected Invoice'));
    await screen.findByText('Invoice id: INV-001');

    await waitFor(() => expect(screen.queryByText('Updated')).not.toBeInTheDocument());
  });

  it('labels highlighted invoices as new for admins', async () => {
    mockApi([{ ...order, customer_name: 'Ada Lovelace', has_changes: true }]);

    render(
      <Provider store={buildStore()}>
        <AllInvoicesPage />
      </Provider>
    );

    expect(await screen.findByText('New')).toBeInTheDocument();
  });

  it('opens the invoice named in the invoice query parameter', async () => {
    mockSearch = 'invoice=90';
    mockApi([order]);

    render(
      <Provider store={buildStore()}>
        <MyInvoicesPage />
      </Provider>
    );

    expect(await screen.findByText('Invoice id: INV-001')).toBeInTheDocument();
    mockSearch = '';
  });

  it('shows an empty state when the customer has no orders', async () => {
    mockApi([]);

    render(
      <Provider store={buildStore()}>
        <MyInvoicesPage />
      </Provider>
    );

    expect(await screen.findByText('No orders yet.')).toBeInTheDocument();
  });

  it('can search all invoices by customer', async () => {
    mockApi([
      { ...order, customer_name: 'Ada Lovelace' },
      { ...order, id: 11, invoice_id: 91, invoice_number: 'INV-002', customer_name: 'Grace Hopper' },
    ]);

    render(
      <Provider store={buildStore()}>
        <AllInvoicesPage />
      </Provider>
    );

    await screen.findByText('Ada Lovelace');
    fireEvent.change(screen.getByPlaceholderText(/Search invoice number, customer/), { target: { value: 'grace' } });

    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('shows a placeholder for missing emails and can filter by email', async () => {
    mockApi([
      { ...order, customer_name: 'Ada Lovelace', customer_email: null },
      { ...order, id: 11, invoice_id: 91, invoice_number: 'INV-002', customer_name: 'Grace Hopper', customer_email: 'grace@example.com' },
    ]);

    render(
      <Provider store={buildStore()}>
        <AllInvoicesPage />
      </Provider>
    );

    const row = await screen.findByRole('row', { name: /Ada Lovelace/ });
    expect(within(row).getByRole('cell', { name: '—' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Search invoice number, customer/), { target: { value: 'grace@example.com' } });

    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('grace@example.com')).toBeInTheDocument();
  });
});
