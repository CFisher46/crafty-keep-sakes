export function getUserByEmail() {
  return `
    SELECT id, email_address, password, first_name, last_name, type
    FROM users
    WHERE email_address = ?
    LIMIT 1
  `;
}
