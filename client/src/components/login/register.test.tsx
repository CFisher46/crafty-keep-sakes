import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import Register from './register';

function completeRegistrationForm() {
  fireEvent.change(screen.getByPlaceholderText('First name'), {
    target: { value: 'Jane' },
  });
  fireEvent.change(screen.getByPlaceholderText('Last name'), {
    target: { value: 'Customer' },
  });
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
    target: { value: 'jane@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
    target: { value: 'password123' },
  });
  fireEvent.change(screen.getByPlaceholderText('Repeat password'), {
    target: { value: 'password123' },
  });
}

describe('UserRegister email verification', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('explains that the account needs email verification after registration', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ verificationEmailSent: true }),
    });

    renderWithProviders(<Register />);

    completeRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(screen.getByText(/We sent a verification link to jane@example.com/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v2/auth/register'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('explains when registration succeeds but verification email delivery fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ verificationEmailSent: false }),
    });

    renderWithProviders(<Register />);
    completeRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText("Your account is ready")).toBeInTheDocument();
    expect(screen.getByText(/couldn't send the verification email/)).toBeInTheDocument();
    expect(screen.getByText(/Try again in/)).toBeInTheDocument();
  });

  it.each([false, true])(
    'keeps the form open when the server reports an existing account (ok: %s)',
    async (ok) => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok,
        json: async () => ({ error: 'An account with that email already exists' }),
      });

      renderWithProviders(<Register />);
      completeRegistrationForm();
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

      expect(await screen.findByText('An account with that email already exists')).toBeInTheDocument();
      expect(screen.queryByText('Check your email')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('jane@example.com');
    }
  );

  it('does not present an unexpected response as a completed registration', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Account created' }),
    });

    renderWithProviders(<Register />);
    completeRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText(/Unable to confirm registration/)).toBeInTheDocument();
    expect(screen.queryByText('Your account is ready')).not.toBeInTheDocument();
  });

  it('prevents another submission while registration is in progress', async () => {
    let resolveFetch: (response: { ok: boolean; json: () => Promise<object> }) => void = () => {
      throw new Error('Fetch promise was not initialized');
    };
    (global.fetch as jest.Mock).mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve;
    }));

    renderWithProviders(<Register />);
    completeRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByRole('button', { name: 'Creating account...' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Creating account...' }));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: false, json: async () => ({ error: 'An account with that email already exists' }) });
    expect(await screen.findByText('An account with that email already exists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeEnabled();
  });
});
