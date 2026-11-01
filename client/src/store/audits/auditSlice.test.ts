import reducer, { clearAuditLogs } from './auditSlice';
import { fetchAuditLogs } from './auditThunks';

const initialState = {
  logs: [],
  totalCount: 0,
  loading: false,
  error: null,
  filterOptions: {
    actor_user_id: [],
    actor_role: [],
    action_type: [],
    resource_type: [],
    source_endpoint: [],
  },
  filterOptionsLoading: false,
  filterOptionsError: null,
};

const sampleAudit = {
  id: 1,
  user: '7',
  field_changed: 'email_address',
  action_type: 'UPDATE',
  api_source: '/user/{id}',
  changed_by: 'Doe, John',
} as any;

describe('auditSlice', () => {
  describe('fetchAuditLogs', () => {
    it('sets loading true on pending', () => {
      const state = reducer(
        { ...initialState, error: 'previous' },
        fetchAuditLogs.pending('id', undefined)
      );

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('populates logs and totalCount on fulfilled', () => {
      const state = reducer(
        { ...initialState, loading: true },
        fetchAuditLogs.fulfilled({ data: [sampleAudit], total_count: 1 }, 'id', undefined)
      );

      expect(state.loading).toBe(false);
      expect(state.logs).toEqual([sampleAudit]);
      expect(state.totalCount).toBe(1);
    });

    it('falls back to data length when total_count is absent', () => {
      const state = reducer(
        initialState,
        fetchAuditLogs.fulfilled({ data: [sampleAudit] }, 'id', undefined)
      );

      expect(state.totalCount).toBe(1);
    });

    it('sets an error message on rejected', () => {
      const action = fetchAuditLogs.rejected(new Error('failed to load'), 'id', undefined);

      const state = reducer({ ...initialState, loading: true }, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe('failed to load');
    });
  });

  describe('clearAuditLogs', () => {
    it('resets logs and totalCount', () => {
      const state = reducer(
        { ...initialState, logs: [sampleAudit], totalCount: 1 },
        clearAuditLogs()
      );

      expect(state.logs).toEqual([]);
      expect(state.totalCount).toBe(0);
    });
  });
});
