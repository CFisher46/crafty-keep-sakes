import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import PageHeader from './header';
import authReducer from '../../store/auth/authSlice';
import basketReducer from '../../store/basket/basketSlice';

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

describe('PageHeader', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPathname = '/Home';
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
});
