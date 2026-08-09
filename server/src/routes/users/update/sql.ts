import { User } from '../types';

export function buildPartialUserUpdateQuery(
  updates: Partial<User>,
  id: string
): {
  sql: string;
  values: Array<string | number | null>;
} {
  const values: Array<string | number | null> = [];

  const setClause = Object.keys(updates)
    .map((field) => {
      const fieldValue = updates[field as keyof User];
      values.push(fieldValue ?? null);
      return `${field} = ?`;
    })
    .join(', ');

  values.push(id);

  return {
    sql: `UPDATE users SET ${setClause} WHERE id = ?`,
    values,
  };
}
