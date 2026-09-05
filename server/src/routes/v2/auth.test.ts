import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import request from 'supertest';

const mockDb = {
  query: jest.fn(),
  getConnection: jest.fn(),
};

jest.mock('../../ts-common/database', () => ({
  db: mockDb,
}));
jest.mock('../../ts-common/helpers', () => ({
  decrypt: jest.fn((value) => value), // Mock: no-op decrypt for testing
}));

import app from '../../app';

const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

describe('v2 auth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it('sets auth_token cookie on successful login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query.mockResolvedValue([
        [
          {
            id: 2,
            email: 'admin@example.com',
            password_hash: hashedPassword,
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

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const now = Date.now() / 1000;
      const expiresIn = decoded.exp - Math.floor(now);

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

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const now = Date.now() / 1000;
      const expiresIn = decoded.exp - Math.floor(now);

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
