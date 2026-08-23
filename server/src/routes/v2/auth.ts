import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import { db } from '../../ts-common/database';
import { decrypt } from '../../ts-common/helpers';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

type AuthSource = 'legacy' | 'dual' | 'v2';

interface LegacyUserPayload extends RowDataPacket {
  id: number | string;
  email_address: string;
  password: string;
  first_name: string;
  last_name: string;
  type: string;
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  town?: string;
  county?: string;
  postcode?: string;
  telephone_number?: string;
}

interface V2UserPayload extends RowDataPacket {
  id: number | string;
  email: string;
  password_hash: string;
  status: 'active' | 'inactive' | 'locked';
  first_name: string;
  last_name: string;
  role_code: string;
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  town?: string;
  county?: string;
  postcode?: string;
  telephone_number?: string;
}

type AuthLookupResult =
  | { source: 'legacy'; user: LegacyUserPayload }
  | { source: 'v2'; user: V2UserPayload }
  | null;

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
    cp.address_line1,
    cp.address_line2,
    cp.address_line3,
    cp.town,
    cp.county,
    cp.postcode,
    cp.telephone AS telephone_number,
    COALESCE(r.code, 'customer') AS role_code
  FROM users_v2 u
  LEFT JOIN customer_profiles_v2 cp ON cp.user_id = u.id
  LEFT JOIN user_roles_v2 ur ON ur.user_id = u.id
  LEFT JOIN roles_v2 r ON r.id = ur.role_id
  WHERE u.email = ?
  LIMIT 1
`;

function resolveAuthSource(rawValue = process.env.AUTH_SOURCE): AuthSource {
  const normalized = String(rawValue || '').trim().toLowerCase();

  if (!normalized) {
    return 'dual';
  }

  if (normalized === 'legacy' || normalized === 'dual' || normalized === 'v2') {
    return normalized;
  }

  return 'dual';
}

async function queryLegacyUserByEmail(email: string): Promise<LegacyUserPayload | null> {
  const [rows] = await db.query<LegacyUserPayload[]>(LEGACY_USER_BY_EMAIL_SQL, [email]);
  return rows[0] ?? null;
}

async function queryV2UserByEmail(email: string): Promise<V2UserPayload | null> {
  const [rows] = await db.query<V2UserPayload[]>(V2_USER_BY_EMAIL_SQL, [email]);
  return rows[0] ?? null;
}

function getSourceOrder(source: AuthSource): Array<'legacy' | 'v2'> {
  if (source === 'legacy') {
    return ['legacy'];
  }

  if (source === 'v2') {
    return ['v2'];
  }

  return ['v2', 'legacy'];
}

async function findAuthUserByEmail(
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

router.post('/login', async (req: any, res: any) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const authUser = await findAuthUserByEmail(String(email));

    if (!authUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = authUser.user as LegacyUserPayload | V2UserPayload;
    const hashToCompare =
      authUser.source === 'v2'
        ? (user as V2UserPayload).password_hash
        : (user as LegacyUserPayload).password;

    const passwordMatch = await bcrypt.compare(password, hashToCompare);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (authUser.source === 'v2' && (user as V2UserPayload).status !== 'active') {
      return res.status(403).json({ error: 'Account inactive' });
    }

    const decryptedFirstName =
      authUser.source === 'legacy' ? decrypt(user.first_name) : user.first_name;
    const decryptedLastName =
      authUser.source === 'legacy' ? decrypt(user.last_name) : user.last_name;

    const emailAddress =
      authUser.source === 'v2'
        ? (user as V2UserPayload).email
        : (user as LegacyUserPayload).email_address;

    const roleType =
      authUser.source === 'v2'
        ? (user as V2UserPayload).role_code || 'customer'
        : (user as LegacyUserPayload).type;

    const payload = {
      id: user.id,
      first_name: decryptedFirstName,
      email_address: emailAddress,
      type: roleType,
      last_name: decryptedLastName,
      address_line1: user.address_line1 || '',
      address_line2: user.address_line2 || '',
      address_line3: user.address_line3 || '',
      town: user.town || '',
      county: user.county || '',
      postcode: user.postcode || '',
      telephone_number: user.telephone_number || '',
    };

    console.info('Auth login success', {
      source: authUser.source,
      user_id: user.id,
      email_address: emailAddress,
      type: roleType,
    });

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: rememberMe ? '30d' : '14d',
    });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24 * 14,
    });

    return res.json({ message: 'Login successful', user: payload });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', (req, res) => {
  void (async () => {
    const token = req.cookies.auth_token;

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    try {
      const user = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & { type?: string };
      res.json({
        user: {
          ...(user as object),
          type: user.type,
        },
        authenticated: true,
      });
    } catch (err) {
      console.error('Token verification error:', err);
      res.status(401).json({ message: 'Invalid token' });
    }
  })();
});

router.post('/logout', async (req: any, res: any) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res.status(200).json({ message: 'Logged out successfully' });
});

export default router;
