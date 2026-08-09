import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('../../../ts-common/database', () => ({
  db: {
    query: jest.fn(),
  },
}));

import app from '../../../app';
import { db } from '../../../ts-common/database';

const mockedDbQuery = db.query as jest.Mock;
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

const authCookie = (id: string | number, role: string) => {
  const token = jwt.sign({ id, type: role }, JWT_SECRET, {
    expiresIn: '1h',
  });

  return [`auth_token=${token}`];
};

describe('v2 users read routes', () => {
  beforeEach(() => {
    mockedDbQuery.mockReset();
  });

  it('returns 401 when listing users without auth', async () => {
    const response = await request(app).get('/api/v2/users');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Not authenticated' });
  });

  it('returns 403 when listing users as non-admin', async () => {
    const response = await request(app)
      .get('/api/v2/users')
      .set('Cookie', authCookie(5, 'customer'));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
  });

  it('lists users from v2 profile and role tables for admin', async () => {
    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          id: 1,
          email: 'admin@example.com',
          status: 'active',
          first_name: 'Ada',
          last_name: 'Lovelace',
          address_line1: '1 Main Street',
          address_line2: '',
          address_line3: '',
          town: 'London',
          county: 'Greater London',
          postcode: 'SW1A 1AA',
          telephone_number: '01234567890',
          type: 'admin',
        },
      ],
    ]);

    const response = await request(app)
      .get('/api/v2/users')
      .set('Cookie', authCookie(1, 'admin'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: '1',
        email_address: 'admin@example.com',
        first_name: 'Ada',
        last_name: 'Lovelace',
        address_line1: '1 Main Street',
        address_line2: '',
        address_line3: '',
        town: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        telephone_number: '01234567890',
        type: 'admin',
        status: 'active',
        invoice_id: null,
        password: '',
      },
    ]);

    const sql = String(mockedDbQuery.mock.calls[0][0]);
    expect(sql).toContain('users_v2');
    expect(sql).toContain('customer_profiles_v2');
    expect(sql).toContain('user_roles_v2');
    expect(sql).toContain('roles_v2');
  });

  it('returns 401 for a single v2 user without auth', async () => {
    const response = await request(app).get('/api/v2/users/7');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Not authenticated' });
  });

  it('returns a single v2 user by id for the same user', async () => {
    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          id: 7,
          email: 'customer@example.com',
          status: 'active',
          first_name: 'Grace',
          last_name: 'Hopper',
          address_line1: '',
          address_line2: '',
          address_line3: '',
          town: '',
          county: '',
          postcode: '',
          telephone_number: '',
          type: 'customer',
        },
      ],
    ]);

    const response = await request(app)
      .get('/api/v2/users/7')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: '7',
      email_address: 'customer@example.com',
      first_name: 'Grace',
      last_name: 'Hopper',
      address_line1: '',
      address_line2: '',
      address_line3: '',
      town: '',
      county: '',
      postcode: '',
      telephone_number: '',
      type: 'customer',
      status: 'active',
      invoice_id: null,
      password: '',
    });

    const sql = String(mockedDbQuery.mock.calls[0][0]);
    expect(sql).toContain('CAST(u.id AS CHAR) = ? OR u.email = ?');
  });

  it('returns 404 for missing v2 user', async () => {
    mockedDbQuery.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .get('/api/v2/users/999')
      .set('Cookie', authCookie(1, 'admin'));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });
});