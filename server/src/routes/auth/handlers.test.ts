import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import meRouter from './get/handler';
import loginRouter from './post/handler';
import logoutRouter from './post/logout';
import { db } from '../../ts-common/database';
import bcrypt from 'bcryptjs';
import { decrypt } from '../../ts-common/helpers';

jest.mock('../../ts-common/database', () => ({
  db: {
    query: jest.fn()
  }
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

jest.mock('../../ts-common/helpers', () => ({
  decrypt: jest.fn((value: string) => `decrypted:${value}`)
}));

const mockedDatabase = db as unknown as { query: jest.Mock };
const mockedBcrypt = bcrypt as unknown as { compare: jest.Mock };
const mockedDecrypt = decrypt as unknown as jest.Mock;

function createTestApp() {
  const app = express();

  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/auth', loginRouter);
  app.use('/api/auth', logoutRouter);
  app.use('/api/auth', meRouter);

  return app;
}

describe('auth handlers', () => {
  beforeEach(() => {
    mockedDatabase.query.mockReset();
    mockedBcrypt.compare.mockReset();
    mockedDecrypt.mockClear();
  });

  it('rejects login when email or password is missing', async () => {
    const app = createTestApp();

    const response = await request(app).post('/api/auth/login').send({ email: 'user@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing email or password' });
    expect(mockedDatabase.query).not.toHaveBeenCalled();
  });

  it('rejects login when the user does not exist', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([[]]);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'secret' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
  });

  it('rejects login when the password does not match', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [{ id: 'user-1', password: 'hash', first_name: 'enc1', last_name: 'enc2' }]
    ]);
    mockedBcrypt.compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
  });

  it('logs in successfully and sets an auth cookie', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [
        {
          id: 'user-1',
          email_address: 'user@example.com',
          password: 'hash',
          first_name: 'enc-first',
          last_name: 'enc-last',
          type: 'customer',
          address_line1: 'line1',
          address_line2: 'line2',
          address_line3: 'line3',
          town: 'town',
          county: 'county',
          postcode: 'postcode',
          telephone_number: '01234'
        }
      ]
    ]);
    mockedBcrypt.compare.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'secret', rememberMe: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Login successful',
      user: expect.objectContaining({
        id: 'user-1',
        first_name: 'decrypted:enc-first',
        last_name: 'decrypted:enc-last',
        type: 'customer'
      })
    });
    expect(response.headers['set-cookie'][0]).toContain('auth_token=');
  });

  it('returns 500 when login fails unexpectedly', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockRejectedValue(new Error('db down'));

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'secret' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
  });

  it('returns the current user from GET /api/auth/me', async () => {
    const app = createTestApp();
    const token = jwt.sign(
      { id: 'user-2', email_address: 'user2@example.com', type: 'admin' },
      process.env.JWT_SECRET as string
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`auth_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      authenticated: true,
      user: {
        email_address: 'user2@example.com',
        id: 'user-2',
        type: 'admin',
        iat: expect.any(Number)
      }
    });
  });

  it('rejects GET /api/auth/me without a token', async () => {
    const app = createTestApp();

    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'No token provided' });
  });

  it('rejects GET /api/auth/me with an invalid token', async () => {
    const app = createTestApp();

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['auth_token=invalid-token']);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid token' });
  });

  it('clears the auth cookie on logout', async () => {
    const app = createTestApp();

    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Logged out successfully' });
    expect(response.headers['set-cookie'][0]).toContain('auth_token=;');
  });
});