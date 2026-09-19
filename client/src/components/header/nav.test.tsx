import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import NavigationBar from './nav';
import authReducer from '../../store/auth/authSlice';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/Shop' }),
  }),
  { virtual: true }
);

const rootReducer = combineReducers({ auth: authReducer });

const buildStore = (preloadedState?: any) =>
  configureStore({ reducer: rootReducer, preloadedState });

describe('NavigationBar', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the core navigation items for a guest', () => {
    const store = buildStore({ auth: { isLoggedIn: false, user: null } });

    render(
      <Provider store={store}>
        <NavigationBar onNavigate={jest.fn()} resetActive={jest.fn()} />
      </Provider>
    );

    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
  });

  it('hides the Admin Tools link for non-admin users', () => {
    const store = buildStore({
      auth: { isLoggedIn: true, user: { id: '1', type: 'customer' } },
    });

    render(
      <Provider store={store}>
        <NavigationBar onNavigate={jest.fn()} resetActive={jest.fn()} />
      </Provider>
    );

    expect(screen.queryByText('Admin Tools')).not.toBeInTheDocument();
  });

  it('shows the Admin Tools link for logged-in admins', () => {
    const store = buildStore({
      auth: { isLoggedIn: true, user: { id: '1', type: 'admin' } },
    });

    render(
      <Provider store={store}>
        <NavigationBar onNavigate={jest.fn()} resetActive={jest.fn()} />
      </Provider>
    );

    expect(screen.getByText('Admin Tools')).toBeInTheDocument();
  });

  it('navigates and calls the onNavigate/resetActive callbacks when a link is clicked', () => {
    const store = buildStore({ auth: { isLoggedIn: false, user: null } });
    const onNavigate = jest.fn();
    const resetActive = jest.fn();

    render(
      <Provider store={store}>
        <NavigationBar onNavigate={onNavigate} resetActive={resetActive} />
      </Provider>
    );

    fireEvent.click(screen.getByText('Blog'));

    expect(onNavigate).toHaveBeenCalledWith('/Blog');
    expect(mockNavigate).toHaveBeenCalledWith('/Blog');
    expect(resetActive).toHaveBeenCalled();
  });
});
