import { checkAuth, performLogout } from './authThunks';
import { loginSuccess, logout, resetState, logoutError } from './authSlice';
import { store } from '../index';

describe('auth thunks', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it('hydrates auth state from /api/v2/auth/me without refreshing the user record', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: '1',
          first_name: 'Ada',
          last_name: 'Lovelace',
          email_address: 'admin@example.com',
          type: 'admin',
        },
      }),
    });

    const dispatch = jest.fn();
    const getState = jest.fn(() => store.getState());

    const result = await checkAuth()(dispatch, getState, undefined);

    expect(result.type).toBe('auth/check/fulfilled');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v2/auth/me'),
      expect.objectContaining({ credentials: 'include' })
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth/loginSuccess' })
    );
  });

  it('does not restore auth from a session check that started before logout', async () => {
    let sessionVersion = 0;
    let resolveFetch!: (response: Response) => void;
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );

    const dispatch = jest.fn((action) => {
      if (action.type === logout.type) sessionVersion += 1;
    });
    const getState = jest.fn(() => ({
      ...store.getState(),
      auth: { ...store.getState().auth, sessionVersion },
    }));

    const sessionCheck = checkAuth()(dispatch, getState, undefined);
    dispatch(logout());
    resolveFetch({
      ok: true,
      json: async () => ({ user: { id: '1' } }),
    } as Response);

    await sessionCheck;

    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: loginSuccess.type })
    );
  });

  it('clears local auth state before waiting for the logout request', async () => {
    let resolveFetch!: (response: Response) => void;
    const dispatch = jest.fn();
    (global.fetch as jest.Mock).mockImplementation(
      () => {
        expect(dispatch).toHaveBeenCalledWith(logout());
        expect(dispatch).toHaveBeenCalledWith(resetState());
        return new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        });
      }
    );

    const logoutRequest = performLogout()(dispatch, jest.fn(), undefined);

    resolveFetch({ ok: true } as Response);
    await logoutRequest;
  });

  it.each([
    ['server error', () => Promise.resolve({ ok: false })],
    ['network error', () => Promise.reject(new Error('offline'))],
  ])('reports %s when sign out cannot revoke sessions', async (_label, response) => {
    (global.fetch as jest.Mock).mockImplementation(response);
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const dispatch = jest.fn();
    const result = await performLogout()(dispatch, jest.fn(), undefined);
    expect(result.type).toBe('auth/logout/rejected');
    expect(dispatch).toHaveBeenCalledWith(logoutError());
    log.mockRestore();
  });
});