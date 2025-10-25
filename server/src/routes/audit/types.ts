export interface AuditLog {
  log_ref?: number;
  user: string;
  field_changed: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  log_dttm?: Date;
  api_source: string;
}
