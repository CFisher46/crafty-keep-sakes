import { checkAuth } from './authThunks';

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
    const getState = jest.fn();

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
});