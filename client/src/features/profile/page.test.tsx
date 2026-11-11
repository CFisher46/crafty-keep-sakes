import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import UsersProfile from './page';
import authReducer, { loginSuccess } from '../../store/auth/authSlice';
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

  it('no longer shows the invoice table on the profile page', async () => {
    render(
      <Provider store={buildStore()}>
        <UsersProfile />
      </Provider>
    );

    expect(screen.queryByText('My Invoices')).not.toBeInTheDocument();
    expect(screen.queryByText('Open Selected Invoice')).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/orders'), expect.anything());
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

  it('ends the local session and prompts for sign-in after a password change', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: { method?: string }) => {
        if (String(url).includes('verify-password')) {
          return Promise.resolve({ ok: true, json: async () => ({ valid: true }) });
        }
        if (options?.method === 'PUT') {
          return Promise.resolve({ ok: true, json: async () => ({}) });
        }
        return Promise.resolve({ ok: true, json: async () => selectedUser });
      });
      const store = buildStore();
      store.dispatch(loginSuccess(selectedUser));
      render(<Provider store={store}><UsersProfile /></Provider>);
      fireEvent.change(screen.getByPlaceholderText('Enter current password'), { target: { value: 'oldpass' } });
      fireEvent.click(screen.getByText('Verify Password'));
      await screen.findByText('Current password verified.');
      fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'NewSecret123' } });
      fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'NewSecret123' } });
      fireEvent.click(screen.getByText('Save Changes'));
      await waitFor(() => expect(store.getState().auth.notice).toMatch(/please sign in again/i));
      expect(store.getState().auth.isLoggedIn).toBe(false);
    });
});
