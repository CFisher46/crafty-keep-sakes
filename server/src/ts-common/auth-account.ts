import { RowDataPacket } from "mysql2";
import { db } from "./database";

interface AuthAccount extends RowDataPacket {
  status: string;
  email_verified: number | boolean;
  role_code: string;
  token_version: number;
}

export async function getAuthAccount(user: {
  id: string | number;
  type?: unknown;
  role_code?: unknown;
}): Promise<AuthAccount | null> {
  const [rows] = await db.query<AuthAccount[]>(
    `SELECT u.status, u.email_verified, u.token_version, COALESCE(r.code, 'customer') AS role_code
     FROM users_v2 u
     LEFT JOIN user_roles_v2 ur ON ur.user_id = u.id
     LEFT JOIN roles_v2 r ON r.id = ur.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [user.id]
  );
  return rows[0] ?? null;
}
