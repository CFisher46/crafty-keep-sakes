export const buildUserAccountUpdateQuery = (
  updates: Array<[string, string | number | null]>
): { sql: string; values: Array<string | number | null> } => {
  const setClause = updates.map(([field]) => `${field} = ?`).join(', ');
  const values = updates.map(([, value]) => value);

  return {
    sql: `UPDATE users_v2 SET ${setClause} WHERE id = ?`,
    values,
  };
};
