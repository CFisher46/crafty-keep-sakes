import express, { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../ts-common/database';
import { JWT_SECRET } from '../../ts-common/jwt-secret';
import { verifyAuthToken, getRequestUser } from '../../ts-common/middleware';

const router = express.Router();


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

async function queryV2UserByEmail(email: string): Promise<V2UserPayload | null> {
  const [rows] = await db.query<V2UserPayload[]>(V2_USER_BY_EMAIL_SQL, [email]);
  return rows[0] ?? null;
}

const V2_USER_BY_ID_SQL = `
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
  WHERE u.id = ?
  LIMIT 1
`;

async function queryV2UserById(id: string | number): Promise<V2UserPayload | null> {
  const [rows] = await db.query<V2UserPayload[]>(V2_USER_BY_ID_SQL, [id]);
  return rows[0] ?? null;
}

const findAuthUserByEmail = queryV2UserByEmail;
const findAuthUserById = queryV2UserById;

const DUMMY_PASSWORD_HASH = bcrypt.hashSync('not-a-real-password', 10);

type LoginRequestBody = {
  email?: string;
  password?: string;
  rememberMe?: boolean;
};

const loginHandler: RequestHandler = async (req, res): Promise<void> => {
  const { email, password, rememberMe } = req.body as LoginRequestBody;

  if (!email || !password) {
    res.status(400).json({ error: 'Missing email or password' });
    return;
  }

  try {
    const authUser = await findAuthUserByEmail(String(email));

    if (!authUser) {
      // Same work as a real check so response time does not reveal valid emails
      await bcrypt.compare(String(password), DUMMY_PASSWORD_HASH);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = authUser;

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Account inactive' });
      return;
    }

    const roleType = user.role_code || 'customer';

    const payload = {
      id: user.id,
      first_name: user.first_name,
      email_address: user.email,
      type: roleType,
      last_name: user.last_name,
      address_line1: user.address_line1 || '',
      address_line2: user.address_line2 || '',
      address_line3: user.address_line3 || '',
      town: user.town || '',
      county: user.county || '',
      postcode: user.postcode || '',
      telephone_number: user.telephone_number || '',
    };

    console.info('Auth login success', {
      user_id: user.id,
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

    res.json({ message: 'Login successful', user: payload });
    return;
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};

const meHandler: RequestHandler = (req, res): void => {
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
};

const verifyPasswordHandler: RequestHandler = async (req, res): Promise<void> => {
  const { currentPassword } = req.body as { currentPassword?: string };
  const userId = getRequestUser(req)?.id;

  if (!userId || !currentPassword) {
    res.status(400).json({ error: 'Missing currentPassword' });
    return;
  }

  try {
    const authUser = await findAuthUserById(String(userId));

    if (!authUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(String(currentPassword), authUser.password_hash);
    res.json({ valid });
    return;
  } catch (err) {
    console.error('Verify password error:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};

const logoutHandler: RequestHandler = (_req, res): void => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.status(200).json({ message: 'Logged out successfully' });
};

const registerHandler: RequestHandler = async (req, res): Promise<void> => {
  const { email, password, first_name, last_name, website, started_at } = req.body as {
    website?: string;
    started_at?: number;
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
  };

  // Bot traps: hidden field filled in, or form submitted implausibly fast.
  // Respond as if it worked so bots get no signal.
  const elapsed = Date.now() - Number(started_at);
  if (website || !Number.isFinite(elapsed) || elapsed < 2000) {
    res.status(201).json({ message: 'Account created' });
    return;
  }

  if (!email || !password || !first_name || !last_name) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    res.status(400).json({ error: 'Please enter a valid email address' });
    return;
  }

  if (String(password).length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const [accountResult] = await connection.query<ResultSetHeader>(
      'INSERT INTO users_v2 (email, password_hash, status) VALUES (?, ?, ?)',
      [String(email).trim(), hashedPassword, 'active']
    );
    const userId = accountResult.insertId;

    await connection.query(
      'INSERT INTO customer_profiles_v2 (user_id, first_name, last_name) VALUES (?, ?, ?)',
      [userId, String(first_name).trim(), String(last_name).trim()]
    );

    const [roleRows] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM roles_v2 WHERE code = 'customer' LIMIT 1"
    );
    const roleId = roleRows[0]?.id;
    if (!roleId) {
      throw new Error('Customer role not found');
    }

    await connection.query(
      'INSERT INTO user_roles_v2 (user_id, role_id) VALUES (?, ?)',
      [userId, roleId]
    );

    await connection.commit();
    res.status(201).json({ message: 'Account created' });
  } catch (err) {
    await connection.rollback();

    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }

    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
};

router.post('/login', loginHandler);
router.post('/register', registerHandler);
router.get('/me', meHandler);
router.post('/verify-password', verifyAuthToken, verifyPasswordHandler);
router.post('/logout', logoutHandler);

export default router;
