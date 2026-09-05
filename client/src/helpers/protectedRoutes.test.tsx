import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import ProtectedRoute from './protectedRoutes';
import authReducer from '../store/auth/authSlice';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    Navigate: (props: { to: string }) => {
      mockNavigate(props.to);
      return <div>Redirected to {props.to}</div>;
    },
  }),
  { virtual: true }
);

const rootReducer = combineReducers({ auth: authReducer });

const buildStore = (preloadedState?: any) =>
  configureStore({ reducer: rootReducer, preloadedState });

describe('ProtectedRoute', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    mockNavigate.mockClear();
  });

  it('renders the protected element when the user is present', () => {
    const store = buildStore({
      auth: { isLoggedIn: true, user: { id: '1', type: 'admin' } },
    });

    render(
      <Provider store={store}>
        <ProtectedRoute element={<div>Secret Content</div>} requiredTypes={['admin']} />
      </Provider>
    );

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('redirects to /home when there is no user and not authenticated', async () => {
    const store = buildStore({
      auth: { isLoggedIn: false, user: null },
    });

    render(
      <Provider store={store}>
        <ProtectedRoute element={<div>Secret Content</div>} requiredTypes={['admin']} />
      </Provider>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/home');
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('renders the element regardless of requiredTypes when a user is already present', () => {
    const store = buildStore({
      auth: { isLoggedIn: true, user: { id: '1', type: 'customer' } },
    });

    render(
      <Provider store={store}>
        <ProtectedRoute element={<div>Secret Content</div>} requiredTypes={['admin']} />
      </Provider>
    );

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });
});
