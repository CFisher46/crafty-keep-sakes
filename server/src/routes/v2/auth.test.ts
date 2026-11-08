import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import request from 'supertest';

const mockDb = {
  query: jest.fn(),
  getConnection: jest.fn(),
};
const mockSendEmail = jest.fn();

jest.mock('../../ts-common/database', () => ({
  db: mockDb,
}));
jest.mock('../../email/service/emailService', () => ({
  sendEmail: mockSendEmail,
}));

import app from '../../app';

const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

describe('v2 auth routes', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalAllowedOrigins = process.env.VERIFICATION_FRONTEND_ORIGINS;
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue({ id: 'email-id' });
  });

  afterEach(() => {
    if (originalFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalFrontendUrl;
    }
    if (originalAllowedOrigins === undefined) {
      delete process.env.VERIFICATION_FRONTEND_ORIGINS;
    } else {
      process.env.VERIFICATION_FRONTEND_ORIGINS = originalAllowedOrigins;
    }
  });

  describe('POST /api/v2/auth/verify-password', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .post('/api/v2/auth/verify-password')
        .send({ userId: 1, currentPassword: 'password123' });

      expect(response.status).toBe(401);
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v2/auth/register', () => {
    const body = {
      email: 'new@example.com',
      password: 'password123',
      first_name: 'A',
      last_name: 'B',
      started_at: Date.now() - 10000,
    };

    it('returns 400 when fields are missing', async () => {
      const response = await request(app).post('/api/v2/auth/register').send({ email: 'a@b.co', started_at: Date.now() - 10000 });
      expect(response.status).toBe(400);
      expect(mockDb.getConnection).not.toHaveBeenCalled();
    });

    it('returns 400 for short passwords', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({ ...body, password: 'short' });
      expect(response.status).toBe(400);
    });

    it('silently ignores honeypot and too-fast submissions', async () => {
      const filled = await request(app)
        .post('/api/v2/auth/register')
        .send({ ...body, website: 'http://spam.example' });
      const fast = await request(app)
        .post('/api/v2/auth/register')
        .send({ ...body, started_at: Date.now() });
      const missing = await request(app)
        .post('/api/v2/auth/register')
        .send({ ...body, started_at: undefined });

      expect([filled.status, fast.status, missing.status]).toEqual([201, 201, 201]);
      expect(mockDb.getConnection).not.toHaveBeenCalled();
    });

    it('creates a customer account', async () => {
      process.env.FRONTEND_URL = 'https://craftykeepsakes.uk';
      process.env.VERIFICATION_FRONTEND_ORIGINS = 'https://dev.craftykeepsakes.uk';
      const connection = {
        beginTransaction: jest.fn(),
        query: jest
          .fn()
          .mockResolvedValueOnce([{ insertId: 9 }])
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([[{ id: 2 }]])
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([{ insertId: 10 }]),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      mockDb.getConnection.mockResolvedValue(connection);
      mockDb.query.mockResolvedValue([{ affectedRows: 1 }]);

      const response = await request(app)
        .post('/api/v2/auth/register')
        .set('Origin', 'https://dev.craftykeepsakes.uk')
        .send(body);

      expect(response.status).toBe(201);
      expect(response.body.verificationEmailSent).toBe(true);
      expect(connection.commit).toHaveBeenCalled();
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: body.email,
          from: 'verify',
          text: expect.stringMatching(
            /https:\/\/dev\.craftykeepsakes\.uk\/verify-email\?token=[a-f0-9]{64}/
          ),
        })
      );
      const tokenInsert = connection.query.mock.calls.find(([sql]) =>
        String(sql).includes('INSERT INTO email_verification_tokens_v2')
      );
      expect(tokenInsert).toBeDefined();
      expect(tokenInsert?.[1][1]).toMatch(/^[a-f0-9]{64}$/);
      expect(mockDb.query.mock.calls[0][1][0]).toBe(tokenInsert?.[1][1]);
    });

    it('keeps the account and offers retry when delivery fails', async () => {
      const connection = {
        beginTransaction: jest.fn(),
        query: jest
          .fn()
          .mockResolvedValueOnce([{ insertId: 9 }])
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([[{ id: 2 }]])
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([{ insertId: 10 }]),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      mockDb.getConnection.mockResolvedValue(connection);
      mockSendEmail.mockRejectedValue(new Error('provider unavailable'));

      const response = await request(app).post('/api/v2/auth/register').send(body);

      expect(response.status).toBe(201);
      expect(response.body.verificationEmailSent).toBe(false);
      expect(connection.commit).toHaveBeenCalled();
      expect(connection.rollback).not.toHaveBeenCalled();
    });

    it('returns 409 for duplicate emails', async () => {
      const connection = {
        beginTransaction: jest.fn(),
        query: jest.fn().mockRejectedValue({ code: 'ER_DUP_ENTRY' }),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      mockDb.getConnection.mockResolvedValue(connection);

      const response = await request(app).post('/api/v2/auth/register').send(body);

      expect(response.status).toBe(409);
      expect(connection.rollback).toHaveBeenCalled();
    });
  });

  describe('POST /api/v2/auth/login', () => {
    it('returns 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing email or password' });
    });

    it('returns 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing email or password' });
    });

    it('returns 400 when both email and password are missing', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing email or password' });
    });

    it('returns 401 when user not found', async () => {
      mockDb.query.mockResolvedValue([[]]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'notfound@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('returns 401 when password is incorrect for V2 user', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);

      mockDb.query.mockResolvedValue([
        [
          {
            id: 1,
            email: 'user@example.com',
            password_hash: hashedPassword,
            email_verified: true,
            status: 'active',
            first_name: 'John',
            last_name: 'Doe',
            role_code: 'customer',
          },
        ],
      ]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'user@example.com', password: 'wrongPassword' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('returns 403 when V2 account is inactive', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query.mockResolvedValue([
        [
          {
            id: 1,
            email: 'user@example.com',
            password_hash: hashedPassword,
            email_verified: true,
            status: 'inactive',
            first_name: 'John',
            last_name: 'Doe',
            role_code: 'customer',
          },
        ],
      ]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Account inactive' });
    });

    it('returns 403 when V2 account is locked', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query.mockResolvedValue([
        [
          {
            id: 1,
            email: 'user@example.com',
            password_hash: hashedPassword,
            email_verified: true,
            status: 'locked',
            first_name: 'John',
            last_name: 'Doe',
            role_code: 'customer',
          },
        ],
      ]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Account inactive' });
    });

    it('successfully authenticates V2 user with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query.mockResolvedValue([
        [
          {
            id: 1,
            email: 'user@example.com',
            password_hash: hashedPassword,
            email_verified: true,
            status: 'active',
            first_name: 'John',
            last_name: 'Doe',
            role_code: 'customer',
            address_line1: '123 Main St',
            address_line2: '',
            town: 'Springfield',
            county: 'State',
            postcode: '12345',
            telephone_number: '555-1234',
          },
        ],
      ]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 1,
            email_address: 'user@example.com',
            first_name: 'John',
            last_name: 'Doe',
            type: 'customer',
          }),
        })
      );
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('records the last login time for V2 users and still logs in if that fails', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const row = {
        id: 1,
        email: 'user@example.com',
        password_hash: hashedPassword,
        email_verified: true,
        status: 'active',
        first_name: 'John',
        last_name: 'Doe',
        role_code: 'customer',
      };

      mockDb.query.mockResolvedValueOnce([[row]]);
      mockDb.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      const [sql, params] = mockDb.query.mock.calls[1];
      expect(String(sql)).toContain('UPDATE users_v2 SET last_login_at');
      expect(params).toEqual([1]);

      mockDb.query.mockReset();
      mockDb.query.mockResolvedValueOnce([[row]]);
      mockDb.query.mockRejectedValueOnce(new Error('write failed'));

      const failing = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(failing.status).toBe(200);
    });

    it('sets auth_token cookie on successful login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query.mockResolvedValue([
        [
          {
            id: 2,
            email: 'admin@example.com',
            password_hash: hashedPassword,
            email_verified: true,
            status: 'active',
            first_name: 'Admin',
            last_name: 'User',
            role_code: 'admin',
            address_line1: '',
            address_line2: '',
            town: '',
            county: '',
            postcode: '',
            telephone_number: '',
          },
        ],
      ]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'admin@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();

      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain('auth_token=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('sets 14 day expiration by default', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query.mockResolvedValue([
        [
          {
            id: 1,
            email: 'user@example.com',
            password_hash: hashedPassword,
            email_verified: true,
            status: 'active',
            first_name: 'John',
            last_name: 'Doe',
            role_code: 'customer',
            address_line1: '',
            address_line2: '',
            town: '',
            county: '',
            postcode: '',
            telephone_number: '',
          },
        ],
      ]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'user@example.com', password: 'password123', rememberMe: false });

      expect(response.status).toBe(200);

      const cookie = response.headers['set-cookie'][0];
      const token = cookie.split(';')[0].split('=')[1];

      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp! - now;

      expect(expiresIn).toBeGreaterThan(13 * 24 * 60 * 60);
      expect(expiresIn).toBeLessThanOrEqual(14 * 24 * 60 * 60);
    });

    it('sets 30 day expiration when rememberMe is true', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query.mockResolvedValue([
        [
          {
            id: 1,
            email: 'user@example.com',
            password_hash: hashedPassword,
            email_verified: true,
            status: 'active',
            first_name: 'John',
            last_name: 'Doe',
            role_code: 'customer',
            address_line1: '',
            address_line2: '',
            town: '',
            county: '',
            postcode: '',
            telephone_number: '',
          },
        ],
      ]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'user@example.com', password: 'password123', rememberMe: true });

      expect(response.status).toBe(200);

      const cookie = response.headers['set-cookie'][0];
      const token = cookie.split(';')[0].split('=')[1];

      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp! - now;

      expect(expiresIn).toBeGreaterThan(29 * 24 * 60 * 60);
      expect(expiresIn).toBeLessThanOrEqual(30 * 24 * 60 * 60);
    });

    it('applies admin role correctly', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query.mockResolvedValue([
        [
          {
            id: 99,
            email: 'admin@example.com',
            password_hash: hashedPassword,
            email_verified: true,
            status: 'active',
            first_name: 'Admin',
            last_name: 'Person',
            role_code: 'admin',
            address_line1: '',
            address_line2: '',
            town: '',
            county: '',
            postcode: '',
            telephone_number: '',
          },
        ],
      ]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'admin@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.user.type).toBe('admin');
    });

    it('defaults role to customer if role_code is null', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query.mockResolvedValue([
        [
          {
            id: 1,
            email: 'user@example.com',
            password_hash: hashedPassword,
            email_verified: true,
            status: 'active',
            first_name: 'John',
            last_name: 'Doe',
            role_code: null,
            address_line1: '',
            address_line2: '',
            town: '',
            county: '',
            postcode: '',
            telephone_number: '',
          },
        ],
      ]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.user.type).toBe('customer');
    });

    it('blocks unverified users before issuing an authentication cookie', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockDb.query.mockResolvedValueOnce([[
        {
          id: 21,
          email: 'waiting@example.com',
          password_hash: hashedPassword,
          email_verified: false,
          status: 'active',
          first_name: 'Waiting',
          last_name: 'User',
          role_code: 'customer',
        },
      ]]);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'waiting@example.com', password: 'password123' });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('POST /api/v2/auth/verify-email', () => {
    const token = 'a'.repeat(64);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const buildConnection = (rows: object[]) => ({
      beginTransaction: jest.fn(),
      query: jest.fn().mockResolvedValueOnce([rows]).mockResolvedValue([{}]),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    });

    it('rejects malformed tokens without accessing the database', async () => {
      const response = await request(app)
        .post('/api/v2/auth/verify-email')
        .send({ token: 'not-a-token' });

      expect(response.status).toBe(400);
      expect(mockDb.getConnection).not.toHaveBeenCalled();
    });

    it('verifies a valid token and marks it used in one transaction', async () => {
      const connection = buildConnection([
        { user_id: 7, used_at: null, is_expired: 0, email_verified: 0 },
      ]);
      mockDb.getConnection.mockResolvedValue(connection);

      const response = await request(app)
        .post('/api/v2/auth/verify-email')
        .send({ token });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('verified');
      expect(connection.query.mock.calls[0][1]).toEqual([tokenHash]);
      expect(connection.query.mock.calls[1][0]).toContain(
        'UPDATE users_v2 SET email_verified = 1'
      );
      expect(connection.query.mock.calls[2][0]).toContain(
        'UPDATE email_verification_tokens_v2 SET used_at'
      );
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    it('returns an expired-link response without verifying the account', async () => {
      const connection = buildConnection([
        { user_id: 7, used_at: null, is_expired: 1, email_verified: 0 },
      ]);
      mockDb.getConnection.mockResolvedValue(connection);

      const response = await request(app)
        .post('/api/v2/auth/verify-email')
        .send({ token });

      expect(response.status).toBe(410);
      expect(response.body.code).toBe('TOKEN_EXPIRED');
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.rollback).toHaveBeenCalledTimes(1);
    });

    it('handles a link for an already verified account', async () => {
      const connection = buildConnection([
        { user_id: 7, used_at: expect.anything(), is_expired: 0, email_verified: 1 },
      ]);
      mockDb.getConnection.mockResolvedValue(connection);

      const response = await request(app)
        .post('/api/v2/auth/verify-email')
        .send({ token });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('already_verified');
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/v2/auth/resend-verification', () => {
    const genericMessage =
      'If an unverified account exists for that address, a verification email will be sent.';

    it('returns the generic response for unknown addresses', async () => {
      const connection = {
        beginTransaction: jest.fn(),
        query: jest.fn().mockResolvedValueOnce([[]]),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      mockDb.getConnection.mockResolvedValue(connection);

      const response = await request(app)
        .post('/api/v2/auth/resend-verification')
        .send({ email: 'unknown@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(genericMessage);
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(connection.commit).toHaveBeenCalledTimes(1);
    });

    it('creates a replacement token and sends email for unverified users', async () => {
      process.env.FRONTEND_URL = 'https://craftykeepsakes.uk';
      process.env.VERIFICATION_FRONTEND_ORIGINS = 'https://dev.craftykeepsakes.uk';
      const connection = {
        beginTransaction: jest.fn(),
        query: jest
          .fn()
          .mockResolvedValueOnce([[
            { id: 7, email: 'waiting@example.com', email_verified: 0, first_name: 'Waiting', last_name: 'User' },
          ]])
          .mockResolvedValueOnce([[]])
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([{ insertId: 12 }]),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      mockDb.getConnection.mockResolvedValue(connection);
      mockDb.query.mockResolvedValue([{ affectedRows: 1 }]);

      const response = await request(app)
        .post('/api/v2/auth/resend-verification')
        .set('Origin', 'https://dev.craftykeepsakes.uk')
        .send({ email: 'WAITING@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(genericMessage);
      expect(connection.commit).toHaveBeenCalledTimes(1);
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'waiting@example.com',
          from: 'verify',
          text: expect.stringMatching(
            /https:\/\/dev\.craftykeepsakes\.uk\/verify-email\?token=[a-f0-9]{64}/
          ),
        })
      );
      const tokenInsert = connection.query.mock.calls.find(([sql]) =>
        String(sql).includes('INSERT INTO email_verification_tokens_v2')
      );
      expect(tokenInsert?.[1][1]).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('GET /api/v2/auth/me', () => {
    it('returns 401 when no auth token provided', async () => {
      const response = await request(app).get('/api/v2/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'No token provided' });
    });

    it('returns 401 when invalid auth token provided', async () => {
      const response = await request(app)
        .get('/api/v2/auth/me')
        .set('Cookie', 'auth_token=invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Invalid token' });
    });

    it('returns user data from valid JWT token', async () => {
      const payload = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email_address: 'user@example.com',
        type: 'customer',
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/v2/auth/me')
        .set('Cookie', `auth_token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        authenticated: true,
        user: expect.objectContaining({
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email_address: 'user@example.com',
          type: 'customer',
        }),
      });
    });

    it('returns admin user data from valid JWT token', async () => {
      const payload = {
        id: 99,
        first_name: 'Admin',
        last_name: 'User',
        email_address: 'admin@example.com',
        type: 'admin',
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/v2/auth/me')
        .set('Cookie', `auth_token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.type).toBe('admin');
    });
  });

  describe('POST /api/v2/auth/logout', () => {
    it('clears auth_token cookie on logout', async () => {
      const response = await request(app).post('/api/v2/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Logged out successfully' });
      expect(response.headers['set-cookie']).toBeDefined();

      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain('auth_token=;');
      expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
    });
  });
});
