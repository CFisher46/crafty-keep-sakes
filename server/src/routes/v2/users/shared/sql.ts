export const SELECT_ROLE_ID_BY_CODE_QUERY = `
  SELECT id
  FROM roles_v2
  WHERE code = ?
  LIMIT 1
`;

export const DELETE_USER_ROLE_QUERY = `
  DELETE FROM user_roles_v2
  WHERE user_id = ?
`;

export const INSERT_USER_ROLE_QUERY = `
  INSERT INTO user_roles_v2 (user_id, role_id)
  VALUES (?, ?)
`;

export const UPSERT_CUSTOMER_PROFILE_QUERY = `
  INSERT INTO customer_profiles_v2 (
    user_id,
    first_name,
    last_name,
    telephone,
    address_line1,
    address_line2,
    address_line3,
    town,
    county,
    postcode
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    telephone = VALUES(telephone),
    address_line1 = VALUES(address_line1),
    address_line2 = VALUES(address_line2),
    address_line3 = VALUES(address_line3),
    town = VALUES(town),
    county = VALUES(county),
    postcode = VALUES(postcode)
`;
