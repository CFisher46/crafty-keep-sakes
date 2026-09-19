import { fetchAuditLogs, createAuditEntry } from './auditThunks';

describe('auditThunks', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  describe('fetchAuditLogs', () => {
    it('fetches audit logs with default pagination', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], total_count: 0 }),
      });

      const result = await fetchAuditLogs()(jest.fn(), jest.fn(), undefined);

      expect(result.type).toBe('audit/fetchLogs/fulfilled');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('fetches audit logs with custom pagination params', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], total_count: 0 }),
      });

      await fetchAuditLogs({ page: 3, pageSize: 25 })(jest.fn(), jest.fn(), undefined);

      const requestedUrl = String((global.fetch as jest.Mock).mock.calls[0][0]);
      expect(requestedUrl).toContain('page=3');
      expect(requestedUrl).toContain('pageSize=25');
    });

    it('derives total_count from array length when not provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [{ id: 1 }, { id: 2 }],
      });

      const result = await fetchAuditLogs()(jest.fn(), jest.fn(), undefined);

      const payload = result.payload as { data: unknown; total_count: number };
      expect(payload.total_count).toBe(2);
    });

    it('rejects when the response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      const result = await fetchAuditLogs()(jest.fn(), jest.fn(), undefined);

      expect(result.type).toBe('audit/fetchLogs/rejected');
      expect(result.payload).toBe('Failed to fetch audit logs');
    });

    it('rejects on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network down'));

      const result = await fetchAuditLogs()(jest.fn(), jest.fn(), undefined);

      expect(result.type).toBe('audit/fetchLogs/rejected');
      expect(result.payload).toBe('Network down');
    });
  });

  describe('createAuditEntry', () => {
    const auditData = {
      user: '7',
      field_changed: 'email_address',
      action_type: 'UPDATE',
      api_source: '/user/{id}',
      changed_by: 'Doe, John',
    };

    it('creates an audit entry successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, ...auditData }),
      });

      const result = await createAuditEntry(auditData)(jest.fn(), jest.fn(), undefined);

      expect(result.type).toBe('audits/create/fulfilled');
    });

    it('sends a POST request with the audit payload', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, ...auditData }),
      });

      await createAuditEntry(auditData)(jest.fn(), jest.fn(), undefined);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify(auditData),
        })
      );
    });

    it('rejects with server error message on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid audit data' }),
      });

      const result = await createAuditEntry(auditData)(jest.fn(), jest.fn(), undefined);

      expect(result.type).toBe('audits/create/rejected');
      expect(result.payload).toBe('Invalid audit data');
    });

    it('rejects on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Timeout'));

      const result = await createAuditEntry(auditData)(jest.fn(), jest.fn(), undefined);

      expect(result.type).toBe('audits/create/rejected');
      expect(result.payload).toBe('Timeout');
    });
  });
});
