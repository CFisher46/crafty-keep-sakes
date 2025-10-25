import { Audit } from '../types';

export function createAuditLogQuery(audit: Audit) {
  return {
    sql: `
      INSERT INTO audit_logs (user, field_changed,changed_by, action_type, log_dttm, api_source)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    values: [
      audit.user,
      audit.field_changed,
      audit.changed_by,
      audit.action_type,
      audit.log_dttm,
      audit.api_source,
    ],
  };
}
