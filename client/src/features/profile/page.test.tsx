import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import UsersProfile from './page';
import authReducer from '../../store/auth/authSlice';
import usersReducer from '../../store/users/usersSlice';
import basketReducer from '../../store/basket/basketSlice';

jest.mock(
  'react-router-dom',
  () => ({
    useParams: () => ({ id: '5' }),
  }),
  { virtual: true }
);

const rootReducer = combineReducers({
  auth: authReducer,
  users: usersReducer,
  basket: basketReducer,
});

const selectedUser = {
  id: '5',
  email_address: 'jane@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  address_line1: '1 Main St',
  address_line2: '',
  address_line3: '',
  town: 'Springfield',
  county: 'State',
  postcode: '12345',
  telephone_number: '555-1234',
  type: 'customer',
  status: 'active',
  password: '',
  invoice_id: 0,
};

const buildStore = () =>
  configureStore({
    reducer: rootReducer,
    preloadedState: {
      users: {
        list: [],
        selectedUser,
        loading: false,
        error: null,
        isLoggedIn: false,
      },
    } as any,
  });

describe('UsersProfile', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the profile fields populated from the selected user', () => {
    render(
      <Provider store={buildStore()}>
        <UsersProfile />
      </Provider>
    );

    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
  });

  it('shows "No orders yet." when the order history is empty', async () => {
    render(
      <Provider store={buildStore()}>
        <UsersProfile />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No orders yet.')).toBeInTheDocument();
    });
  });

  it('renders order history rows when orders exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 10,
          user_id: 5,
          order_status: 'placed',
          grand_total: 25.5,
          invoice_id: 90,
          invoice_number: 'INV-001',
          placed_at: '2026-08-15 10:00:00',
        },
      ],
    });

    render(
      <Provider store={buildStore()}>
        <UsersProfile />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });
  });

  it('requires the current password before verifying', () => {
    render(
      <Provider store={buildStore()}>
        <UsersProfile />
      </Provider>
    );

    expect(screen.getByText('Verify Password')).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Enter current password'), {
      target: { value: 'oldpass' },
    });

    expect(screen.getByText('Verify Password')).not.toBeDisabled();
  });

  it('shows an error when the current password is incorrect', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (String(url).includes('verify-password')) {
        return Promise.resolve({ ok: true, json: async () => ({ valid: false }) });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });

    render(
      <Provider store={buildStore()}>
        <UsersProfile />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter current password'), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByText('Verify Password'));

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect.')).toBeInTheDocument();
    });
  });

  it('shows a save confirmation message after saving the profile', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });

    render(
      <Provider store={buildStore()}>
        <UsersProfile />
      </Provider>
    );

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('Profile saved')).toBeInTheDocument();
    });
  });

  it('blocks saving a new password without verifying the current password first', async () => {
    render(
      <Provider store={buildStore()}>
        <UsersProfile />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
      target: { value: 'NewSecret123' },
    });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(
        screen.getByText('Please verify your current password before changing it.')
      ).toBeInTheDocument();
    });
  });
});
