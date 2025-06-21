export function DeleteUserQuery(id: string) {
  return {
    sql: "DELETE FROM users WHERE id = ?",
    values: [id]
  };
}
