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

  it('shows inline validation and blocks invalid values', () => {
    render(<Provider store={buildStore()}><CreateNewUser /></Provider>);
    fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByPlaceholderText('Telephone Number'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByText('Create User'));
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid telephone number (7 to 15 digits).')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('updates password matching when the original password changes and resets confirmation', () => {
    render(<Provider store={buildStore()}><CreateNewUser /></Provider>);
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'Secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Different1' } });
    fireEvent.blur(screen.getByPlaceholderText('Confirm Password'));
    expect(screen.getByText('Passwords must match.')).toBeInTheDocument();
    expect(screen.getByText('Create User')).toBeDisabled();
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByPlaceholderText('Confirm Password')).toHaveValue('');
    expect(screen.queryByText('Passwords must match.')).not.toBeInTheDocument();
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
      target: { value: ' jane@example.com ' },
    });
    fireEvent.change(screen.getByPlaceholderText('Telephone Number'), { target: { value: '+44 20 1234 5678' } });
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
    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(options.body)).toMatchObject({
      email_address: 'jane@example.com',
      telephone_number: '+44 20 1234 5678',
      password: 'Secret123',
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
