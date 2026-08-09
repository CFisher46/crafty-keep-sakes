import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { decrypt } from '../../../ts-common/helpers'; // Your decryption function
import { findAuthUserByEmail } from '../shared/user-lookup';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

type LegacyUserPayload = {
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
};

type V2UserPayload = {
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
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // if (!user.is_verified) {
    //   return res.status(403).json({ error: "Email not verified" });
    // }

    // Decrypt sensitive fields before creating JWT payload
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

    res.json({ message: 'Login successful', user: payload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// router.post("/verify-password", async (req, res) => {
//   const { userId, currentPassword } = req.body;
// });

export default router;
