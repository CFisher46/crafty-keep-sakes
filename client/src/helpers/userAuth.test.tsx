import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useAuth from './userAuth';
import authReducer from '../store/auth/authSlice';

const buildStore = () => configureStore({ reducer: { auth: authReducer } });

const wrapper = (store: ReturnType<typeof buildStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };

describe('useAuth', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs the user in when the session endpoint succeeds', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: '1', first_name: 'John', type: 'customer' },
      }),
    });

    const store = buildStore();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.userType).toBe('customer');
    expect(result.current.user).toEqual(
      expect.objectContaining({ id: '1', first_name: 'John' })
    );
  });

  it('logs the user out when the session endpoint fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    const store = buildStore();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.userType).toBeNull();
  });

  it('logs the user out when the fetch throws a network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const store = buildStore();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  it('calls the session endpoint with credentials included', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: '1', type: 'admin' } }),
    });

    const store = buildStore();
    renderHook(() => useAuth(), { wrapper: wrapper(store) });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/me'),
        expect.objectContaining({ method: 'GET', credentials: 'include' })
      );
    });
  });
});
