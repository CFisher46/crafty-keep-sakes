import { Audit } from '../types';

export function createAuditLogQuery(audit: AuditLog) {
  return {
    sql: `
      INSERT INTO audit_logs (user, field_changed, action_type, api_source)
      VALUES (?, ?, ?, ?)
    `,
    values: [
      audit.user,
      audit.field_changed,
      audit.action_type,
      audit.api_source,
    ],
  };
}
