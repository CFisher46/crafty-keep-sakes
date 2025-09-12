export const getAudits = () => {
  return `
    WITH filteredAudit AS (
    SELECT
        user, 
        field_changed, 
        action_type, 
        log_dttm, 
        api_source
    FROM audit_log
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
                    'user',fa.user,
                    'field_changed', fa.field_changed,
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
