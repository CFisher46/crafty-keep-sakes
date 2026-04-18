import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import createUserRouter from './create/handler';
import deleteUserRouter from './delete/handler';
import getUserByIdRouter from './get-by-id/handler';
import getUsersRouter from './get/handler';
import updateUserRouter from './update/handler';
import { db } from '../../ts-common/database';
import { decrypt, encrypt } from '../../ts-common/helpers';

jest.mock('../../ts-common/database', () => ({
  db: {
    query: jest.fn()
  }
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn()
}));

jest.mock('../../ts-common/helpers', () => ({
  decrypt: jest.fn((value: string) => `decrypted:${value}`),
  encrypt: jest.fn((value: string) => `encrypted:${value}`)
}));

const mockedDatabase = db as unknown as { query: jest.Mock };
const mockedBcrypt = bcrypt as unknown as { hash: jest.Mock };
const mockedDecrypt = decrypt as unknown as jest.Mock;
const mockedEncrypt = encrypt as unknown as jest.Mock;

function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use('/api/users', getUsersRouter);
  app.use('/api/users', getUserByIdRouter);
  app.use('/api/users', createUserRouter);
  app.use('/api/users', updateUserRouter);
  app.use('/api/users', deleteUserRouter);

  return app;
}

describe('user handlers', () => {
  beforeEach(() => {
    mockedDatabase.query.mockReset();
    mockedBcrypt.hash.mockReset();
    mockedDecrypt.mockClear();
    mockedEncrypt.mockClear();
    mockedBcrypt.hash.mockResolvedValue('hashed-password');
  });

  it('returns all users with decrypted names', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [
        {
          result: JSON.stringify({
            data: JSON.stringify([
              { id: 'user-1', first_name: 'enc-first', last_name: 'enc-last' }
            ])
          })
        }
      ]
    ]);

    const response = await request(app).get('/api/users/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 'user-1',
        first_name: 'decrypted:enc-first',
        last_name: 'decrypted:enc-last'
      }
    ]);
  });

  it('returns 500 when GET /api/users fails', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockRejectedValue(new Error('db down'));

    const response = await request(app).get('/api/users/');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Database error' });
  });

  it('returns a decrypted user from GET /api/users/:id', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [
        {
          result: JSON.stringify({
            data: JSON.stringify([
              {
                id: 'user-2',
                first_name: 'enc-first',
                last_name: 'enc-last',
                address_line1: 'enc-address-1',
                address_line2: 'enc-address-2',
                address_line3: 'enc-address-3',
                telephone_number: 'enc-phone'
              }
            ])
          })
        }
      ]
    ]);

    const response = await request(app).get('/api/users/user-2');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'user-2',
      first_name: 'decrypted:enc-first',
      last_name: 'decrypted:enc-last',
      address_line1: 'decrypted:enc-address-1',
      address_line2: 'decrypted:enc-address-2',
      address_line3: 'decrypted:enc-address-3',
      telephone_number: 'decrypted:enc-phone'
    });
  });

  it('returns 404 when GET /api/users/:id cannot find a user', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([[{ result: JSON.stringify({ data: '[]' }) }]]);

    const response = await request(app).get('/api/users/missing-user');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('creates a user with encrypted fields and a hashed password', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([{ insertId: 42 }]);

    const response = await request(app)
      .post('/api/users/')
      .send({
        id: 'user-3',
        email_address: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        address_line1: '1 Street',
        address_line2: 'Area',
        address_line3: 'District',
        town: 'Town',
        county: 'County',
        postcode: 'AB12',
        telephone_number: '01234',
        type: 'customer',
        status: 'active',
        invoice_id: 1,
        password: 'password'
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'User created', insertId: 42 });
    expect(mockedEncrypt).toHaveBeenCalledTimes(6);
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('password', 10);
  });

  it('returns 500 when user creation fails', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockRejectedValue(new Error('db down'));

    const response = await request(app)
      .post('/api/users/')
      .send({ password: 'password' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Database error' });
  });

  it('rejects empty user updates', async () => {
    const app = createTestApp();

    const response = await request(app).put('/api/users/user-4').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'No fields to update' });
  });

  it('updates a user with encrypted fields and a hashed password', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([{ affectedRows: 1 }]);

    const response = await request(app)
      .put('/api/users/user-5')
      .send({ first_name: 'Updated', telephone_number: '999', password: 'next-password' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'User updated', affectedRows: 1 });
    expect(mockedEncrypt).toHaveBeenCalledWith('Updated');
    expect(mockedEncrypt).toHaveBeenCalledWith('999');
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('next-password', 10);
  });

  it('returns 500 when user update fails', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockRejectedValue(new Error('db down'));

    const response = await request(app)
      .put('/api/users/user-6')
      .send({ first_name: 'Updated' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Database error' });
  });

  it('deletes a user', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([{ affectedRows: 1 }]);

    const response = await request(app).delete('/api/users/user-7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ affectedRows: 1 });
  });

  it('returns 500 when user deletion fails', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockRejectedValue(new Error('db down'));

    const response = await request(app).delete('/api/users/user-8');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to delete user' });
  });
});