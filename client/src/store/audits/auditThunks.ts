import { createAsyncThunk } from '@reduxjs/toolkit';
import { Audit } from '../../types';
import { buildApiUrl } from '../../api/apiPath';

export type AuditLogResponse = {
  data: Audit[];
  total_count?: number;
};

export const fetchAuditLogs = createAsyncThunk<
  AuditLogResponse,
  { page?: number; pageSize?: number } | void
>(
  'audit/fetchLogs',
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({
        page: String(params?.page ?? 1),
        pageSize: String(params?.pageSize ?? 10),
      });

      const response = await fetch(buildApiUrl('audit', `?${query.toString()}`), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      return {
        data: data.data || data,
        total_count: data.total_count ?? (Array.isArray(data) ? data.length : 0),
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch audit logs');
    }
  }
);

export const createAuditEntry = createAsyncThunk<
  Audit,
  {
    user: string;
    field_changed: string;
    action_type: string;
    api_source: string;
    changed_by: string;
  },
  { rejectValue: string }
>('audits/create', async (auditData, { rejectWithValue }) => {
  try {
    const res = await fetch(buildApiUrl('audit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(auditData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return rejectWithValue(errorData.error || 'Failed to create audit entry');
    }

    const data = await res.json();
    return data;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Network error');
  }
});
