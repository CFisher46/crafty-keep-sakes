export type Audit = {
  id: number;
  actor_user_id: number | null;
  actor_role: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  source_endpoint: string;
  old_values_json?: unknown;
  new_values_json?: unknown;
  created_at: string;
};

export const auditFilterFields = [
  'actor_user_id',
  'actor_role',
  'action_type',
  'resource_type',
  'source_endpoint',
] as const;

export type AuditFilterField = (typeof auditFilterFields)[number];
export type AuditFilterOptions = Record<AuditFilterField, string[]>;
