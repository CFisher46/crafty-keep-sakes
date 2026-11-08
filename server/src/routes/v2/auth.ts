import express, { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../ts-common/database';
//import { notify } from '../../notifications/service';
import { JWT_SECRET } from '../../ts-common/jwt-secret';
import { verifyAuthToken, getRequestUser } from '../../ts-common/middleware';
import { sendEmail } from '../../email/service/emailService';
import VerifyEmail from '../../email/templates/VerifyEmail';
import { createVerificationToken, hashVerificationToken } from '../../email/service/verificationService';
//import { verify } from 'crypto';

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
  email_verified: boolean;
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
    u.email_verified,
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
    u.email_verified,
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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const authUser = await findAuthUserByEmail(String(email).trim().toLowerCase());

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
      email_verified: user.email_verified || false,
    };

    if (!(user.email_verified)) {
      res.status(403).json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });
      return;
    }

    console.info('Auth login success', {
      user_id: user.id,
      type: roleType,
    });


    try {
      await db.query('UPDATE users_v2 SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    } catch (err) {
      console.error('Failed to record last login:', err);
    }

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
    res.status(201).json({ message: 'Account created', verificationEmailSent: true });
    return;
  }

  if (!email || !password || !first_name || !last_name) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (!EMAIL_PATTERN.test(String(email))) {
    res.status(400).json({ error: 'Please enter a valid email address' });
    return;
  }

  if (String(password).length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const firstName = String(first_name).trim();
  const lastName = String(last_name).trim();
  const connection = await db.getConnection();
  let userId: number;
  let verificationUrl: string;
  let tokenHash: string;

  try {
    await connection.beginTransaction();

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const [accountResult] = await connection.query<ResultSetHeader>(
      'INSERT INTO users_v2 (email, password_hash, status) VALUES (?, ?, ?)',
      [normalizedEmail, hashedPassword, 'active']
    );
    userId = accountResult.insertId;

    await connection.query(
      'INSERT INTO customer_profiles_v2 (user_id, first_name, last_name) VALUES (?, ?, ?)',
      [userId, firstName, lastName]
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

    ({ verificationUrl, tokenHash } = await createVerificationToken(connection, userId));

    await connection.commit();
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Registration rollback failed:', rollbackError);
    }

    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }

    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  } finally {
    connection.release();
  }

  try {
    await sendEmail({
      from: 'verify',
      email: normalizedEmail,
      subject: 'Verify your Crafty Keepsakes email',
      template: VerifyEmail({
        name: `${firstName} ${lastName}`.trim() || 'there',
        verificationUrl,
      }),
      text: `Welcome to Crafty Keepsakes. Verify your email within 24 hours: ${verificationUrl}. If you did not create an account, you can ignore this email.`,
    });
    try {
      await db.query(
        'UPDATE email_verification_tokens_v2 SET sent_at = CURRENT_TIMESTAMP WHERE token_hash = ?',
        [tokenHash]
      );
    } catch (err) {
      console.error('Could not record verification email delivery:', err);
    }
    res.status(201).json({ message: 'Account created. Check your email to verify it.', verificationEmailSent: true });
  } catch {
    console.error('Verification email delivery failed after registration');
    res.status(201).json({
      message: 'Account created, but the verification email could not be sent. Please request another email.',
      verificationEmailSent: false,
    });
  }
};

const verifyEmailTokenHandler: RequestHandler = async (req, res): Promise<void> => {
  const token = (req.body as { token?: unknown } | undefined)?.token;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    res.status(400).json({ error: 'A valid verification token is required', code: 'INVALID_TOKEN' });
    return;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT t.user_id, t.used_at, t.expires_at,
              (t.expires_at <= CURRENT_TIMESTAMP) AS is_expired,
              u.email_verified
       FROM email_verification_tokens_v2 t
       INNER JOIN users_v2 u ON u.id = t.user_id
       WHERE t.token_hash = ?
       FOR UPDATE`,
      [hashVerificationToken(token)]
    );
    const record = rows[0];
    if (!record) {
      await connection.rollback();
      res.status(400).json({ error: 'This verification link is invalid', code: 'INVALID_TOKEN' });
      return;
    }
    if (record.email_verified) {
      await connection.commit();
      res.status(200).json({ status: 'already_verified', message: 'Email is already verified' });
      return;
    }
    if (record.used_at) {
      await connection.rollback();
      res.status(400).json({ error: 'This verification link has already been used', code: 'TOKEN_USED' });
      return;
    }
    if (record.is_expired) {
      await connection.rollback();
      res.status(410).json({ error: 'This verification link has expired', code: 'TOKEN_EXPIRED' });
      return;
    }

    await connection.query(
      'UPDATE users_v2 SET email_verified = 1, email_verified_at = CURRENT_TIMESTAMP WHERE id = ?',
      [record.user_id]
    );
    await connection.query(
      'UPDATE email_verification_tokens_v2 SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND used_at IS NULL',
      [hashVerificationToken(token)]
    );
    await connection.commit();
    res.status(200).json({ status: 'verified', message: 'Email verified successfully' });
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Email verification rollback failed:', rollbackError);
    }
    console.error('Email verification failed:', err);
    res.status(500).json({ error: 'Unable to verify this email right now' });
  } finally {
    connection.release();
  }
};

const resendVerificationHandler: RequestHandler = async (req, res): Promise<void> => {
  const rawEmail = (req.body as { email?: unknown }).email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(email)) {
    res.status(400).json({ error: 'Please enter a valid email address' });
    return;
  }

  const genericResponse = {
    message: 'If an unverified account exists for that address, a verification email will be sent.',
  };
  const connection = await db.getConnection();
  let account: RowDataPacket | undefined;
  let verificationUrl: string | undefined;
  let tokenHash: string | undefined;

  try {
    await connection.beginTransaction();
    const [users] = await connection.query<RowDataPacket[]>(
      `SELECT u.id, u.email, u.email_verified, cp.first_name, cp.last_name
       FROM users_v2 u
       LEFT JOIN customer_profiles_v2 cp ON cp.user_id = u.id
       WHERE u.email = ?
       LIMIT 1
       FOR UPDATE`,
      [email]
    );
    account = users[0];

    if (!account || account.email_verified) {
      await connection.commit();
      res.status(200).json(genericResponse);
      return;
    }

    const [recentSends] = await connection.query<RowDataPacket[]>(
      `SELECT id
       FROM email_verification_tokens_v2
       WHERE user_id = ? AND created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 60 SECOND)
       LIMIT 1`,
      [account.id]
    );
    if (recentSends.length > 0) {
      await connection.commit();
      res.status(200).json(genericResponse);
      return;
    }

    ({ verificationUrl, tokenHash } = await createVerificationToken(connection, Number(account.id)));
    await connection.commit();
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Resend verification rollback failed:', rollbackError);
    }
    console.error('Could not prepare verification email:', err);
    res.status(500).json({ error: 'Unable to process the request right now' });
    return;
  } finally {
    connection.release();
  }

  if (!account || !verificationUrl || !tokenHash) {
    console.error('Verification resend request completed without a prepared token');
    res.status(500).json({ error: 'Unable to process the request right now' });
    return;
  }

  res.status(200).json(genericResponse);
  void sendEmail({
      from: 'verify',
      email,
      subject: 'Verify your Crafty Keepsakes email',
      template: VerifyEmail({
        name: `${account.first_name ?? ''} ${account.last_name ?? ''}`.trim() || 'there',
        verificationUrl,
      }),
      text: `Verify your Crafty Keepsakes email within 24 hours: ${verificationUrl}. If you did not create an account, you can ignore this email.`,
    }).then(async () => {
      try {
        await db.query(
          'UPDATE email_verification_tokens_v2 SET sent_at = CURRENT_TIMESTAMP WHERE token_hash = ?',
          [tokenHash]
        );
      } catch (err) {
        console.error('Could not record resent verification email delivery:', err);
      }
    }).catch(() => {
      console.error('Verification email resend failed');
    });
};

router.post('/login', loginHandler);
router.post('/register', registerHandler);
router.get('/me', meHandler);
router.post('/verify-email', verifyEmailTokenHandler);
router.post('/resend-verification', resendVerificationHandler);
router.post('/verify-password', verifyAuthToken, verifyPasswordHandler);
router.post('/logout', logoutHandler);

export default router;
