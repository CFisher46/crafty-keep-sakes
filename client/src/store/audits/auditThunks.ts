import { createAsyncThunk } from '@reduxjs/toolkit';
import { buildApiUrl } from '../../api/apiPath';
import { auditFilterFields } from '../../types';
import type {
  Audit,
  AuditFilterField,
  AuditFilterOptions,
} from '../../types';

export type AuditLogResponse = {
  data: Audit[];
  total_count?: number;
};

export type AuditLogParams = {
  page?: number;
  pageSize?: number;
  filters?: Partial<Record<AuditFilterField, string[]>>;
};

const emptyAuditFilterOptions = (): AuditFilterOptions => ({
  actor_user_id: [],
  actor_role: [],
  action_type: [],
  resource_type: [],
  source_endpoint: [],
});

export const fetchAuditLogs = createAsyncThunk<
  AuditLogResponse,
  AuditLogParams | void
>(
  'audit/fetchLogs',
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({
        page: String(params?.page ?? 1),
        pageSize: String(params?.pageSize ?? 10),
      });
      auditFilterFields.forEach((field) => {
        (params?.filters?.[field] ?? []).forEach((value) => query.append(field, value));
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

export const fetchAuditFilterOptions = createAsyncThunk<AuditFilterOptions>(
  'audit/fetchFilterOptions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('audit', '/filters'), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit filter options');
      }

      const options = await response.json();
      return auditFilterFields.reduce((result, field) => {
        const values = options[field];
        if (!Array.isArray(values)) {
          throw new Error(`Invalid audit filter options for ${field}`);
        }
        result[field] = values.map(String);
        return result;
      }, emptyAuditFilterOptions());
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch audit filter options'
      );
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
