export const INSERT_USER_ACCOUNT_QUERY = `
  INSERT INTO users_v2 (email, password_hash, status)
  VALUES (?, ?, ?)
`;
