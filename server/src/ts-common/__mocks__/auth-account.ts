// Route tests use token claims as fixtures; middleware tests exercise the real lookup.
export async function getAuthAccount(user: { type?: unknown; role_code?: unknown }) {
  return {
    status: "active",
    email_verified: true,
    role_code: String(user.type || user.role_code || ""),
    token_version: 0,
  };
}
