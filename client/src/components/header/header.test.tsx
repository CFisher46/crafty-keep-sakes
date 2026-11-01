import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import PageHeader from './header';
import authReducer from '../../store/auth/authSlice';
import basketReducer from '../../store/basket/basketSlice';
import { NOTIFICATIONS_CHANGED_EVENT } from '../../features/notifications/events';

const mockNavigate = jest.fn();
let mockPathname = '/Home';

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: mockPathname }),
  }),
  { virtual: true }
);

const rootReducer = combineReducers({ auth: authReducer, basket: basketReducer });

const buildStore = (preloadedState?: any) =>
  configureStore({ reducer: rootReducer, preloadedState });

const mockFetch = (unread = 0) => {
  global.fetch = jest.fn(async (url: string) => {
    if (String(url).includes('notifications')) {
      return { ok: true, json: async () => ({ unread }) };
    }

    return { ok: true, json: async () => ({ data: [] }) };
  }) as unknown as typeof fetch;
};

describe('PageHeader', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPathname = '/Home';
    mockFetch(0);
  });

  it('navigates home when the logo is clicked', () => {
  const store = buildStore({
    auth: { isLoggedIn: false, user: null },
    basket: { items: [], totalItems: 0 },
  });

  render(
    <Provider store={store}>
      <PageHeader />
    </Provider>
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Logo' })
  );

  expect(mockNavigate).toHaveBeenCalledWith('/Home');
});

  it('does not show a basket count badge when the basket is empty', () => {
    const store = buildStore({
      auth: { isLoggedIn: false, user: null },
      basket: { items: [], totalItems: 0 },
    });

    render(
      <Provider store={store}>
        <PageHeader />
      </Provider>
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows a basket count badge when items are present', () => {
    const store = buildStore({
      auth: { isLoggedIn: false, user: null },
      basket: { items: [{ id: '1', image: '', product_name: 'Mug', price: 10, quantity: 3 }], totalItems: 3 },
    });

    render(
      <Provider store={store}>
        <PageHeader />
      </Provider>
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('navigates to the profile page for the logged-in user', () => {
    const store = buildStore({
      auth: { isLoggedIn: true, user: { id: '42' } },
      basket: { items: [], totalItems: 0 },
    });

    render(
      <Provider store={store}>
        <PageHeader />
      </Provider>
    );

      const profileButton = screen.getByRole('button', {
    name: 'Profile',
  });
    fireEvent.click(profileButton);

    expect(mockNavigate).toHaveBeenCalledWith('/profile/42');
  });

  it('opens a sign-in panel instead of navigating when logged out', () => {
    mockPathname = '/Blog';
    const store = buildStore({
      auth: { isLoggedIn: false, user: null },
      basket: { items: [], totalItems: 0 },
    });

    render(
      <Provider store={store}>
        <PageHeader />
      </Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(screen.getByText('Create an account', { selector: 'h2' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('asks the landing page to focus its login panel instead of opening the popout', () => {
    const store = buildStore({
      auth: { isLoggedIn: false, user: null },
      basket: { items: [], totalItems: 0 },
    });
    const listener = jest.fn();
    window.addEventListener('cks:focus-login', listener);

    render(
      <Provider store={store}>
        <PageHeader />
      </Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    window.removeEventListener('cks:focus-login', listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('shows an unread count on the notifications bell', async () => {
    mockFetch(4);
    const store = buildStore({
      auth: { isLoggedIn: true, user: { id: '7', type: 'admin' } },
      basket: { items: [], totalItems: 0 },
    });

    render(
      <Provider store={store}>
        <PageHeader />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('4 unread notifications')).toHaveTextContent('4');
    });
  });

  it('does not fetch a notification count for guests', () => {
    const store = buildStore({
      auth: { isLoggedIn: false, user: null },
      basket: { items: [], totalItems: 0 },
    });

    render(
      <Provider store={store}>
        <PageHeader />
      </Provider>
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/unread notifications/)).not.toBeInTheDocument();
  });

  it('refreshes the bell count when notifications change', async () => {
    let unread = 0;
    global.fetch = jest.fn(async (url: string) => {
      if (String(url).includes('notifications')) {
        return { ok: true, json: async () => ({ unread }) };
      }

      return { ok: true, json: async () => ({ data: [] }) };
    }) as unknown as typeof fetch;

    const store = buildStore({
      auth: { isLoggedIn: true, user: { id: '7', type: 'customer' } },
      basket: { items: [], totalItems: 0 },
    });

    render(
      <Provider store={store}>
        <PageHeader />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/unread notifications/)).not.toBeInTheDocument();
    });

    unread = 2;
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));

    await waitFor(() => {
      expect(screen.getByLabelText('2 unread notifications')).toHaveTextContent('2');
    });
  });
});
