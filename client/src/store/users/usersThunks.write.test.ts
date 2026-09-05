import { updateUser, deleteUser, verifyCurrentPassword, fetchUserById, createUser } from './usersThunks';

jest.mock('../audits/auditThunks', () => ({
  createAuditEntry: (payload: any) => ({ type: 'audits/createAuditEntry', payload }),
}));

describe('usersThunks (write operations)', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  describe('fetchUserById', () => {
    it('rejects with status and message when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'User not found',
      });

      const result = await fetchUserById('999')(jest.fn(), jest.fn(), undefined);

      expect(result.type).toBe('users/fetchUserById/rejected');
      expect(result.payload).toBe('Error: 404 - User not found');
    });

    it('rejects on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('down'));

      const result = await fetchUserById('7')(jest.fn(), jest.fn(), undefined);

      expect(result.type).toBe('users/fetchUserById/rejected');
      expect(result.payload).toBe('Network or server error');
    });
  });

  describe('updateUser', () => {
    it('updates a user successfully without a previousUser', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      const result = await updateUser({ id: '7', user: { first_name: 'Jane' } })(
        dispatch,
        getState,
        undefined
      );

      expect(result.type).toBe('users/update/fulfilled');
      const payload = result.payload as { id: string; first_name: string };
      expect(payload.id).toBe('7');
      expect(payload.first_name).toBe('Jane');
    });

    it('dispatches audit entries for changed fields excluding password', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: { first_name: 'A', last_name: 'B' } } }));

      await updateUser({
        id: '7',
        user: { first_name: 'Jane', password: 'newpass' },
        previousUser: { first_name: 'John', password: 'oldpass' } as any,
      })(dispatch, getState, undefined);

      const auditCalls = dispatch.mock.calls.filter(
        ([action]) => action.type === 'audits/createAuditEntry'
      );

      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][0].payload.field_changed).toBe('first_name');
    });

    it('rejects with server error message on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Email already in use' }),
      });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      const result = await updateUser({ id: '7', user: { email_address: 'dup@example.com' } })(
        dispatch,
        getState,
        undefined
      );

      expect(result.type).toBe('users/update/rejected');
      expect(result.payload).toBe('Email already in use');
    });

    it('rejects on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection lost'));

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      const result = await updateUser({ id: '7', user: {} })(dispatch, getState, undefined);

      expect(result.type).toBe('users/update/rejected');
      expect(result.payload).toBe('Connection lost');
    });
  });

  describe('deleteUser', () => {
    it('deletes a user and dispatches an audit entry', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: { first_name: 'A', last_name: 'B' } } }));

      const result = await deleteUser('7')(dispatch, getState, undefined);

      expect(result.type).toBe('users/delete/fulfilled');
      expect(result.payload).toBe('7');
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'audits/createAuditEntry' })
      );
    });

    it('sends a DELETE request to the correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      await deleteUser('42')(dispatch, getState, undefined);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/users/42'),
        expect.objectContaining({ method: 'DELETE', credentials: 'include' })
      );
    });
  });

  describe('verifyCurrentPassword', () => {
    it('returns true when the password is valid', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ valid: true }),
      });

      const result = await verifyCurrentPassword('7', 'correct-password');

      expect(result).toBe(true);
    });

    it('returns false when the password is invalid', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ valid: false }),
      });

      const result = await verifyCurrentPassword('7', 'wrong-password');

      expect(result).toBe(false);
    });

    it('throws when the request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      await expect(verifyCurrentPassword('7', 'password')).rejects.toThrow(
        'Failed to verify password'
      );
    });
  });

  describe('createUser', () => {
    it('creates a user and dispatches an audit entry with the new insertId', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ insertId: 55 }),
      });

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: { first_name: 'A', last_name: 'B' } } }));

      const result = await createUser({ first_name: 'New' })(dispatch, getState, undefined);

      expect(result.type).toBe('users/create/fulfilled');
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'audits/createAuditEntry',
          payload: expect.objectContaining({ user: '55' }),
        })
      );
    });

    it('rejects on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));

      const dispatch = jest.fn();
      const getState = jest.fn(() => ({ auth: { user: null } }));

      const result = await createUser({})(dispatch, getState, undefined);

      expect(result.type).toBe('users/create/rejected');
      expect(result.payload).toBe('offline');
    });
  });
});
