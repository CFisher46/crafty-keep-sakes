import { fireEvent, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import Register from './register';

let mockUseRealPolicyModal = false;
jest.mock('../policies/policy-modal', () => ({
  __esModule: true,
  default: (props: { onClose: () => void; policy: { title: string; fileName: string } }) => {
    if (mockUseRealPolicyModal) {
      const RealPolicyModal = jest.requireActual('../policies/policy-modal').default;
      return <RealPolicyModal {...props} />;
    }
    return <button type="button" onClick={props.onClose}>Close terms</button>;
  },
}));

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
  fireEvent.click(screen.getByRole('button', { name: 'Terms & Conditions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close terms' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'I accept the Terms & Conditions' }));
}

describe('UserRegister email verification', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    mockUseRealPolicyModal = false;
    jest.clearAllMocks();
  });

  it('shows required errors and does not submit an empty form', () => {
    renderWithProviders(<Register />);
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByText('Enter your first name.')).toBeInTheDocument();
    expect(screen.getByText('Enter your last name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByText('Passwords must match.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(['invalid', 'jane@', 'jane@example', 'jane @example.com'])(
    'blocks an incorrectly formatted email: %s',
    (email) => {
      renderWithProviders(<Register />);
      completeRegistrationForm();
      const input = screen.getByLabelText('Email');
      fireEvent.change(input, { target: { value: email } });
      fireEvent.blur(input);
      expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'register-email-error');
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
      expect(global.fetch).not.toHaveBeenCalled();
      fireEvent.change(input, { target: { value: 'jane@example.com' } });
      expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'false');
    }
  );

  it('prevents submission for short or mismatched passwords', () => {
    renderWithProviders(<Register />);
    completeRegistrationForm();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByText('Passwords must match.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('requires acceptance before submitting a valid registration', () => {
    renderWithProviders(<Register />);
    completeRegistrationForm();
    fireEvent.click(screen.getByRole('checkbox', { name: 'I accept the Terms & Conditions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Please accept the Terms & Conditions to create an account.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'I accept the Terms & Conditions' }));
    expect(screen.queryByText('Please accept the Terms & Conditions to create an account.')).not.toBeInTheDocument();
  });

  it('disables acceptance until the terms modal has been opened', () => {
    renderWithProviders(<Register />);
    const checkbox = screen.getByRole('checkbox', { name: 'I accept the Terms & Conditions' });
    expect(checkbox).toBeDisabled();
    expect(screen.getByText('Open the Terms & Conditions before accepting them.')).toBeInTheDocument();

    userEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Please open and accept the Terms & Conditions to create an account.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Terms & Conditions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close terms' }));
    expect(checkbox).toBeEnabled();
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('opens the shared terms file without submitting the form', async () => {
    mockUseRealPolicyModal = true;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['PDF content'], { type: 'application/pdf' }),
    });
    URL.createObjectURL = jest.fn(() => 'blob:terms');
    URL.revokeObjectURL = jest.fn();
    renderWithProviders(<Register />);

    fireEvent.click(screen.getByRole('button', { name: 'Terms & Conditions' }));

    expect(await screen.findByTitle('Terms & Conditions PDF')).toHaveAttribute('src', 'blob:terms');
    expect(screen.getByRole('dialog', { name: 'Terms & Conditions' })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/policies\/Terms%20and%20Conditions%20of%20Sale\.pdf$/),
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog', { name: 'Terms & Conditions' }));
    expect(screen.getByRole('checkbox', { name: 'I accept the Terms & Conditions' })).not.toBeChecked();
  });

  it('trims names and email before sending a valid form', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true, json: async () => ({ verificationEmailSent: true }),
    });
    renderWithProviders(<Register />);
    completeRegistrationForm();
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: ' Jane ' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' jane@example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({
      first_name: 'Jane', email: 'jane@example.com',
    });
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
