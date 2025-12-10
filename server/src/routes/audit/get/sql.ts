export const getAudits = () => {
  return `
    WITH filteredAudit AS (
    SELECT
        log_ref,
        user,
        field_changed,
        changed_by,
        action_type,
        log_dttm,
        api_source
    FROM audit_logs
    ),
    auditCount AS (
        SELECT COUNT(*) AS total_count
        FROM filteredAudit
    )
    SELECT JSON_OBJECT(
        'total_count' , COALESCE(ac.total_count, 0),
        'data',IFNULL(
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'log_ref',fa.log_ref,
                    'user',fa.user,
                    'field_changed', fa.field_changed,
                    'changed_by', fa.changed_by,
                    'action_type', fa.action_type,
                    'log_dttm', fa.log_dttm,
                    'api_source', fa.api_source
                    )
                ),
                JSON_ARRAY()
            )
        ) AS result
        FROM auditCount ac
        LEFT JOIN filteredAudit fa ON TRUE;
    `;
};
