import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import DeleteExistingUser from './deleteUser';
import authReducer from '../../../store/auth/authSlice';
import usersReducer from '../../../store/users/usersSlice';
import auditReducer from '../../../store/audits/auditSlice';
import { User } from '../../../types';

const targetUser: User = {
  id: '2',
  first_name: 'Jane',
  last_name: 'Doe',
  email_address: 'jane@example.com',
  telephone_number: '',
  address_line1: '',
  address_line2: '',
  address_line3: '',
  town: '',
  county: '',
  postcode: '',
  type: 'customer',
  status: 'active',
  password: '',
  invoice_id: 0,
};

const rootReducer = combineReducers({ auth: authReducer, users: usersReducer, audit: auditReducer });

const buildStore = (loggedInUserId: string) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: { isLoggedIn: true, user: { id: loggedInUserId } },
    } as any,
  });

describe('DeleteExistingUser', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the confirmation passcode prompt', () => {
    render(
      <Provider store={buildStore('1')}>
        <DeleteExistingUser {...targetUser} />
      </Provider>
    );

    expect(screen.getByText('Confirmation Required')).toBeInTheDocument();
    expect(screen.getByText('delete jane@example.com')).toBeInTheDocument();
  });

  it('keeps the delete button disabled until the correct passcode is typed', () => {
    render(
      <Provider store={buildStore('1')}>
        <DeleteExistingUser {...targetUser} />
      </Provider>
    );

    expect(screen.getByText('Delete User')).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Type confirmation text here'), {
      target: { value: 'delete jane@example.com' },
    });

    expect(screen.getByText('Delete User')).not.toBeDisabled();
  });

  it('shows a mismatch warning when the passcode is wrong', () => {
    render(
      <Provider store={buildStore('1')}>
        <DeleteExistingUser {...targetUser} />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('Type confirmation text here'), {
      target: { value: 'wrong text' },
    });

    expect(screen.getByText("Confirmation text doesn't match")).toBeInTheDocument();
  });

  it('disables deletion and shows a warning when attempting to self-delete', () => {
    render(
      <Provider store={buildStore('2')}>
        <DeleteExistingUser {...targetUser} />
      </Provider>
    );

    expect(screen.getByPlaceholderText('Type confirmation text here')).toBeDisabled();
    expect(screen.getByText('You cannot delete your own account.')).toBeInTheDocument();
  });

  it('shows the final confirmation dialog after clicking Delete User', () => {
    render(
      <Provider store={buildStore('1')}>
        <DeleteExistingUser {...targetUser} />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('Type confirmation text here'), {
      target: { value: 'delete jane@example.com' },
    });
    fireEvent.click(screen.getByText('Delete User'));

    expect(screen.getByText(/Final Confirmation/)).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone!')).toBeInTheDocument();
  });

  it('calls the cancel handler without dispatching a delete request', () => {
    render(
      <Provider store={buildStore('1')}>
        <DeleteExistingUser {...targetUser} />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('Type confirmation text here'), {
      target: { value: 'delete jane@example.com' },
    });
    fireEvent.click(screen.getByText('Delete User'));
    screen.getAllByText('Cancel').forEach((el) => fireEvent.click(el));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('dispatches deleteUser when the deletion is confirmed', async () => {
    render(
      <Provider store={buildStore('1')}>
        <DeleteExistingUser {...targetUser} />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('Type confirmation text here'), {
      target: { value: 'delete jane@example.com' },
    });
    fireEvent.click(screen.getByText('Delete User'));
    screen.getAllByText('Confirm Delete').forEach((el) => fireEvent.click(el));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/users/2'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
