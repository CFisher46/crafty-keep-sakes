export type V2UserRow = {
  id: number | string;
  email: string;
  status: 'active' | 'inactive' | 'locked' | string;
  first_name: string | null;
  last_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  telephone_number: string | null;
  type: string | null;
};

export const buildAllUsersQuery = () => `
  SELECT
    u.id,
    u.email,
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
    COALESCE(r.code, 'customer') AS type
  FROM users_v2 u
  LEFT JOIN customer_profiles_v2 cp ON cp.user_id = u.id
  LEFT JOIN user_roles_v2 ur ON ur.user_id = u.id
  LEFT JOIN roles_v2 r ON r.id = ur.role_id
  ORDER BY u.id DESC
`;

export const buildUserByIdQuery = () => `
  SELECT
    u.id,
    u.email,
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
    COALESCE(r.code, 'customer') AS type
  FROM users_v2 u
  LEFT JOIN customer_profiles_v2 cp ON cp.user_id = u.id
  LEFT JOIN user_roles_v2 ur ON ur.user_id = u.id
  LEFT JOIN roles_v2 r ON r.id = ur.role_id
  WHERE CAST(u.id AS CHAR) = ? OR u.email = ?
  LIMIT 1
`;