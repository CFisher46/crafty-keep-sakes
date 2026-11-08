import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import VerifyEmailPage from './page';

const mockNavigate = jest.fn();
let mockLocation = { pathname: '/verify-email', search: '' };
let mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useSearchParams: () => [mockSearchParams],
}), { virtual: true });

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockNavigate.mockClear();
    mockLocation = { pathname: '/verify-email', search: '' };
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('removes the token from the visible URL and displays success after verification', async () => {
    mockLocation = { pathname: '/verify-email', search: `?token=${'a'.repeat(64)}` };
    mockSearchParams = new URLSearchParams(mockLocation.search);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'verified', message: 'Email verified successfully' }),
    });

    renderWithProviders(<VerifyEmailPage />);

    expect(mockNavigate).toHaveBeenCalledWith('/verify-email', { replace: true });
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));

    expect(await screen.findByText('Email verified successfully')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v2/auth/verify-email'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64) }),
      })
    );
  });

  it('shows the server error when the verification link has expired', async () => {
    mockLocation = { pathname: '/verify-email', search: `?token=${'b'.repeat(64)}` };
    mockSearchParams = new URLSearchParams(mockLocation.search);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'This verification link has expired' }),
    });

    renderWithProviders(<VerifyEmailPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));

    expect(await screen.findByText('This verification link has expired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send a new link' })).toBeInTheDocument();
  });

  it('requests a replacement email and shows generic confirmation', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'If an unverified account exists for that address, a verification email will be sent.',
      }),
    });

    renderWithProviders(<VerifyEmailPage />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'customer@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send a new link' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/auth/resend-verification'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'customer@example.com' }),
        })
      );
    });
    expect(await screen.findByText(/If an unverified account exists/)).toBeInTheDocument();
  });
});
