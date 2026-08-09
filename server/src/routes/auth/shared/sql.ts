export const LEGACY_USER_BY_EMAIL_SQL = `
  SELECT id, email_address, password, first_name, last_name, type
  FROM users
  WHERE email_address = ?
  LIMIT 1
`;

export const V2_USER_BY_EMAIL_SQL = `
  SELECT
    u.id,
    u.email,
    u.password_hash,
    u.status,
    cp.first_name,
    cp.last_name,
    cp.address_line1,
    cp.address_line2,
    cp.address_line3,
    cp.town,
    cp.county,
    cp.postcode,
    cp.telephone AS telephone_number,
    COALESCE(r.code, 'customer') AS role_code
  FROM users_v2 u
  LEFT JOIN customer_profiles_v2 cp ON cp.user_id = u.id
  LEFT JOIN user_roles_v2 ur ON ur.user_id = u.id
  LEFT JOIN roles_v2 r ON r.id = ur.role_id
  WHERE u.email = ?
  LIMIT 1
`;

export const authLookupSql = {
  legacyByEmail: LEGACY_USER_BY_EMAIL_SQL,
  v2ByEmail: V2_USER_BY_EMAIL_SQL,
};
