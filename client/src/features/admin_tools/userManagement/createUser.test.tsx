import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import CreateNewUser from './createUser';
import authReducer from '../../../store/auth/authSlice';
import usersReducer from '../../../store/users/usersSlice';
import auditReducer from '../../../store/audits/auditSlice';

const rootReducer = combineReducers({ auth: authReducer, users: usersReducer, audit: auditReducer });

const buildStore = () =>
  configureStore({
    reducer: rootReducer,
  });

describe('CreateNewUser', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all required input fields', () => {
    render(
      <Provider store={buildStore()}>
        <CreateNewUser />
      </Provider>
    );

    expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
  });

  it('disables the Create User button until passwords match', () => {
    render(
      <Provider store={buildStore()}>
        <CreateNewUser />
      </Provider>
    );

    expect(screen.getByText('Create User')).toBeDisabled();
  });

  it('enables the Create User button once passwords match', () => {
    render(
      <Provider store={buildStore()}>
        <CreateNewUser />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'Secret123' },
    });

    expect(screen.getByText('Create User')).not.toBeDisabled();
  });

  it('keeps the confirm password field disabled until a password is entered', () => {
    render(
      <Provider store={buildStore()}>
        <CreateNewUser />
      </Provider>
    );

    expect(screen.getByPlaceholderText('Confirm Password')).toBeDisabled();
  });

  it('does not enable Create User when passwords do not match', () => {
    render(
      <Provider store={buildStore()}>
        <CreateNewUser />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'Different1' },
    });

    expect(screen.getByText('Create User')).toBeDisabled();
  });

  it('updates first name field value when typed', () => {
    render(
      <Provider store={buildStore()}>
        <CreateNewUser />
      </Provider>
    );

    const input = screen.getByPlaceholderText('First Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Jane' } });

    expect(input.value).toBe('Jane');
  });

  it('submits the create user request when the form is valid', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'User created', insertId: 5 }),
    });

    render(
      <Provider store={buildStore()}>
        <CreateNewUser />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Email Address'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'Secret123' },
    });

    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/users'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('resets the form when Reset is clicked', () => {
    render(
      <Provider store={buildStore()}>
        <CreateNewUser />
      </Provider>
    );

    const firstNameInput = screen.getByPlaceholderText('First Name') as HTMLInputElement;
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    expect(firstNameInput.value).toBe('Jane');

    fireEvent.click(screen.getByText('Reset'));

    expect(firstNameInput.value).toBe('');
  });
});
