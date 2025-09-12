import { Audit } from "../types";

export function addNewLog(audit: Audit) {
  return {
    sql: `
      INSERT INTO audit_log 
        ( user, field_changed, action_type, log_dttm, api_source)
      VALUES (?,?,?,?,?)
    `,
    values: [
      audit.user,
      audit.field_changed,
      audit.action_type,
      audit.log_dttm,
      audit.api_source
    ]
  };
}
