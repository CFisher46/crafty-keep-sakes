import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import Login from './login';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/', search: '' }),
  useParams: () => ({}),
  Navigate: () => null,
}), { virtual: true });


describe('UserLogin', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders email and password fields', () => {
    renderWithProviders(
      <Login />,
      {
        preloadedState: {
          auth: {
            user: null,
            isLoggedIn: false,
          },
        },
      }
    );

    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('updates form values when typing', () => {
    renderWithProviders(
      <Login />,
      {
        preloadedState: {
          auth: {
            user: null,
            isLoggedIn: false,
          },
        },
      }
    );

    const emailInput = screen.getByPlaceholderText('Username') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('user@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('dispatches loginSuccess and navigates on successful login', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: 1, first_name: 'John', last_name: 'Doe', type: 'customer' },
      }),
    });

    const { store } = renderWithProviders(
      <Login />,
      {
        preloadedState: {
          auth: {
            user: null,
            isLoggedIn: false,
          },
        },
      }
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(store.getState().auth.user).toEqual(
        expect.objectContaining({ id: 1, first_name: 'John' })
      );
    });
  });

  it('syncs guest basket items to the account before completing login', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 1, first_name: 'John', last_name: 'Doe', type: 'customer' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Basket item added',
          basket_id: 1,
          product_id: 5,
          quantity: 2,
          unit_price: 12.5,
        }),
      });

    const { store } = renderWithProviders(
      <Login />,
      {
        preloadedState: {
          auth: { user: null, isLoggedIn: false },
          basket: {
            items: [
              {
                id: '5',
                image: 'tea.jpg',
                product_name: 'Tea Set',
                price: 12.5,
                quantity: 2,
              },
            ],
            totalItems: 2,
          },
        },
      }
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(store.getState().auth.isLoggedIn).toBe(true);
    });
    expect(store.getState().basket.items).toHaveLength(0);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/api/v2/basket/items'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          product_id: 5,
          quantity: 2,
          unit_price: 12.5,
        }),
      })
    );
  });

  it('blocks login and keeps the guest basket when the basket sync fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 1, first_name: 'John', last_name: 'Doe', type: 'customer' },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Out of stock' }),
      });

    const { store } = renderWithProviders(
      <Login />,
      {
        preloadedState: {
          auth: { user: null, isLoggedIn: false },
          basket: {
            items: [
              { id: '5', image: '', product_name: 'Tea Set', price: 12.5, quantity: 2 },
            ],
            totalItems: 2,
          },
        },
      }
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText(/Your basket could not be synced/)).toBeInTheDocument();
    });
    expect(store.getState().auth.isLoggedIn).toBe(false);
    expect(store.getState().basket.items).toHaveLength(1);
  });

  it('displays error message on failed login', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    renderWithProviders(
      <Login />,
      {
        preloadedState: {
          auth: {
            user: null,
            isLoggedIn: false,
          },
        },
      }
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('displays generic error message on network failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    renderWithProviders(
      <Login />,
      {
        preloadedState: {
          auth: {
            user: null,
            isLoggedIn: false,
          },
        },
      }
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Failed to login. Please try again.')).toBeInTheDocument();
    });
  });

  it('sends credentials include with login request', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, type: 'customer' } }),
    });

    renderWithProviders(
      <Login />,
      {
        preloadedState: {
          auth: {
            user: null,
            isLoggedIn: false,
          },
        },
      }
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });
  });

  it('falls back to default error message when server sends no error field', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    renderWithProviders(
      <Login />,
      {
        preloadedState: {
          auth: {
            user: null,
            isLoggedIn: false,
          },
        },
      }
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('An error occurred during login')).toBeInTheDocument();
    });
  });
});
