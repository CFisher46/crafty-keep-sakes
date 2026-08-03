import { RowDataPacket } from 'mysql2';
import { db } from '../../../ts-common/database';
import { resolveAuthSource, AuthSource } from './auth-source';

export interface LegacyAuthUser extends RowDataPacket {
  id: number | string;
  email_address: string;
  password: string;
  first_name: string;
  last_name: string;
  type: string;
}

export interface V2AuthUser extends RowDataPacket {
  id: number | string;
  email: string;
  password_hash: string;
  status: 'active' | 'inactive' | 'locked';
  first_name: string;
  last_name: string;
  role_code: 'admin' | 'customer' | string;
}

const LEGACY_USER_BY_EMAIL_SQL = `
  SELECT id, email_address, password, first_name, last_name, type
  FROM users
  WHERE email_address = ?
  LIMIT 1
`;

const V2_USER_BY_EMAIL_SQL = `
  SELECT
    u.id,
    u.email,
    u.password_hash,
    u.status,
    cp.first_name,
    cp.last_name,
    COALESCE(r.code, 'customer') AS role_code
  FROM users_v2 u
  LEFT JOIN customer_profiles_v2 cp ON cp.user_id = u.id
  LEFT JOIN user_roles_v2 ur ON ur.user_id = u.id
  LEFT JOIN roles_v2 r ON r.id = ur.role_id
  WHERE u.email = ?
  LIMIT 1
`;

export type AuthLookupSource = 'legacy' | 'v2';

export type AuthLookupResult =
  | {
      source: 'legacy';
      user: LegacyAuthUser;
    }
  | {
      source: 'v2';
      user: V2AuthUser;
    }
  | null;

async function queryLegacyUserByEmail(
  email: string
): Promise<LegacyAuthUser | null> {
  const [rows] = await db.query<LegacyAuthUser[]>(LEGACY_USER_BY_EMAIL_SQL, [
    email,
  ]);
  return rows[0] ?? null;
}

async function queryV2UserByEmail(email: string): Promise<V2AuthUser | null> {
  const [rows] = await db.query<V2AuthUser[]>(V2_USER_BY_EMAIL_SQL, [email]);
  return rows[0] ?? null;
}

function getSourceOrder(source: AuthSource): AuthLookupSource[] {
  if (source === 'legacy') {
    return ['legacy'];
  }

  if (source === 'v2') {
    return ['v2'];
  }

  return ['v2', 'legacy'];
}

export async function findAuthUserByEmail(
  email: string,
  source = resolveAuthSource()
): Promise<AuthLookupResult> {
  const sourceOrder = getSourceOrder(source);

  for (const currentSource of sourceOrder) {
    if (currentSource === 'v2') {
      const v2User = await queryV2UserByEmail(email);
      if (v2User) {
        return { source: 'v2', user: v2User };
      }
      continue;
    }

    const legacyUser = await queryLegacyUserByEmail(email);
    if (legacyUser) {
      return { source: 'legacy', user: legacyUser };
    }
  }

  return null;
}

export const authLookupSql = {
  legacyByEmail: LEGACY_USER_BY_EMAIL_SQL,
  v2ByEmail: V2_USER_BY_EMAIL_SQL,
};
