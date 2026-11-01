import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import MyInvoicesPage from './page';
import AllInvoicesPage from '../reporting/invoices/page';
import authReducer from '../../store/auth/authSlice';
import usersReducer from '../../store/users/usersSlice';
import basketReducer from '../../store/basket/basketSlice';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
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
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/orders/all'))).toBe(true);

    fireEvent.click(screen.getByText('INV-001'));
    fireEvent.click(screen.getByText('Open Selected Invoice'));

    expect(await screen.findByText('Manage invoice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.queryByText('Confirm Update')).not.toBeInTheDocument();
    expect(screen.queryByText('Update Tracking Info')).not.toBeInTheDocument();
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
});
