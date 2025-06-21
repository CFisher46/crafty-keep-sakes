export function GetSpecificUsersQuery(id: string) {
  const result = `
    WITH FilteredUsers AS (
      SELECT
        u.id,
        u.email_address,
        u.first_name,
        u.last_name,
        u.address_line1,
        u.address_line2,
        u.address_line3,
        u.town,
        u.county,
        u.postcode,
        u.telephone_number,
        u.type,
        u.status,
        u.invoice_id,
        u.password
      FROM users u
      WHERE u.id IN ('${id}')
    ),
    UserCount AS (
      SELECT COUNT(*) AS total_count
      FROM FilteredUsers
    )
    SELECT JSON_OBJECT(
      'total_count', COALESCE(uc.total_count, 0),
      'data', IFNULL(
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', fu.id,
            'email_address', fu.email_address,
            'first_name', fu.first_name,
            'last_name', fu.last_name,
            'address_line1', fu.address_line1,
            'address_line2', fu.address_line2,
            'address_line3', fu.address_line3,
            'town', fu.town,
            'county', fu.county,
            'postcode', fu.postcode,
            'telephone_number', fu.telephone_number,
            'type', fu.type,
            'status', fu.status,
            'invoice_id', fu.invoice_id,
            'password', fu.password
          )
        ),
        JSON_ARRAY()
      )
    ) AS result
    FROM UserCount uc
    LEFT JOIN FilteredUsers fu ON TRUE;
  `;
  return result;
}
