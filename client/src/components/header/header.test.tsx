import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import PageHeader from './header';
import authReducer from '../../store/auth/authSlice';
import basketReducer from '../../store/basket/basketSlice';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/Home' }),
  }),
  { virtual: true }
);

const rootReducer = combineReducers({ auth: authReducer, basket: basketReducer });

const buildStore = (preloadedState?: any) =>
  configureStore({ reducer: rootReducer, preloadedState });

describe('PageHeader', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
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

    fireEvent.click(screen.getByAltText('Logo'));

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

    const profileButton = document.querySelectorAll('button')[2];
    fireEvent.click(profileButton);

    expect(mockNavigate).toHaveBeenCalledWith('/profile/42');
  });
});
