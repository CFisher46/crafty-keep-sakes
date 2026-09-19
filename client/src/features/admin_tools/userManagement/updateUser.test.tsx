import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import UpdateUser from './updateUser';
import authReducer from '../../../store/auth/authSlice';
import usersReducer from '../../../store/users/usersSlice';
import auditReducer from '../../../store/audits/auditSlice';

const rootReducer = combineReducers({ auth: authReducer, users: usersReducer, audit: auditReducer });

const buildStore = () => configureStore({ reducer: rootReducer });

const existingUser = {
  id: '5',
  first_name: 'John',
  last_name: 'Doe',
  email_address: 'john@example.com',
  telephone_number: '555-1234',
  address_line1: '1 Main St',
  address_line2: '',
  address_line3: '',
  town: 'Springfield',
  county: 'State',
  postcode: '12345',
  type: 'customer',
  status: 'active',
  password: '',
  invoice_id: 0,
};

describe('UpdateUser', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders editable fields for all non-sensitive user properties', () => {
    render(
      <Provider store={buildStore()}>
        <UpdateUser {...existingUser} />
      </Provider>
    );

    expect(screen.getByPlaceholderText('John')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('5')).not.toBeInTheDocument();
  });

  it('does nothing when no fields have changed', () => {
    render(
      <Provider store={buildStore()}>
        <UpdateUser {...existingUser} />
      </Provider>
    );

    fireEvent.click(screen.getByText('Update User'));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits only the changed field to the update endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(
      <Provider store={buildStore()}>
        <UpdateUser {...existingUser} />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('Doe'), {
      target: { value: 'Smith' },
    });
    fireEvent.click(screen.getByText('Update User'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/users/5'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ last_name: 'Smith' }),
        })
      );
    });
  });

  it('clears the changed fields after a successful update', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(
      <Provider store={buildStore()}>
        <UpdateUser {...existingUser} />
      </Provider>
    );

    const lastNameInput = screen.getByPlaceholderText('Doe') as HTMLInputElement;
    fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
    expect(lastNameInput.value).toBe('Smith');

    fireEvent.click(screen.getByText('Update User'));

    await waitFor(() => {
      expect(lastNameInput.value).toBe('');
    });
  });

  it('enables the confirm password field only after a new password is entered', () => {
    render(
      <Provider store={buildStore()}>
        <UpdateUser {...existingUser} />
      </Provider>
    );

    expect(screen.getByPlaceholderText('Confirm Password')).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('New Password'), {
      target: { value: 'NewSecret123' },
    });

    expect(screen.getByPlaceholderText('Confirm Password')).not.toBeDisabled();
  });
});
