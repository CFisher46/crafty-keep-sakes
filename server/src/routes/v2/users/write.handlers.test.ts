import jwt from 'jsonwebtoken';
import request from 'supertest';

const mockConnection = {
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
  query: jest.fn(),
};

jest.mock('../../../ts-common/database', () => ({
  db: {
    query: jest.fn(),
    getConnection: jest.fn(async () => mockConnection),
  },
}));

import app from '../../../app';

const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

const authCookie = (id: string | number, role: string) => {
  const token = jwt.sign({ id, type: role }, JWT_SECRET, {
    expiresIn: '1h',
  });

  return [`auth_token=${token}`];
};

describe('v2 users write routes', () => {
  beforeEach(() => {
    mockConnection.beginTransaction.mockReset();
    mockConnection.commit.mockReset();
    mockConnection.rollback.mockReset();
    mockConnection.release.mockReset();
    mockConnection.query.mockReset();
  });

  it('returns 401 for unauthenticated create request', async () => {
    const response = await request(app).post('/api/v2/users').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Not authenticated' });
  });

  it('returns 403 for non-admin create request', async () => {
    const response = await request(app)
      .post('/api/v2/users')
      .set('Cookie', authCookie(1, 'customer'))
      .send({});

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
  });

  it('creates a v2 user, profile, and role as admin', async () => {
    mockConnection.query
      .mockResolvedValueOnce([{ insertId: 42 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .post('/api/v2/users')
      .set('Cookie', authCookie(1, 'admin'))
      .send({
        email_address: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        password: 'Password123!',
        type: 'customer',
        status: 'active',
        address_line1: '1 Test Street',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: 'User created',
      insertId: 42,
    });

    const firstSql = String(mockConnection.query.mock.calls[0][0]);
    const secondSql = String(mockConnection.query.mock.calls[1][0]);
    const thirdSql = String(mockConnection.query.mock.calls[2][0]);

    expect(firstSql).toContain('INSERT INTO users_v2');
    expect(secondSql).toContain('customer_profiles_v2');
    expect(thirdSql).toContain('roles_v2');
  });

  it('returns 400 for create with unknown role', async () => {
    mockConnection.query
      .mockResolvedValueOnce([{ insertId: 42 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[]]);

    const response = await request(app)
      .post('/api/v2/users')
      .set('Cookie', authCookie(1, 'admin'))
      .send({
        email_address: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        password: 'Password123!',
        type: 'unknown-role',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Unknown role code: unknown-role' });
  });

  it('updates a v2 user as admin', async () => {
    mockConnection.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 2 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .put('/api/v2/users/42')
      .set('Cookie', authCookie(1, 'admin'))
      .send({
        email_address: 'updated@example.com',
        first_name: 'Updated',
        last_name: 'User',
        type: 'admin',
        status: 'active',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'User updated',
      affectedRows: 1,
    });

    const updateSql = String(mockConnection.query.mock.calls[0][0]);
    expect(updateSql).toContain('UPDATE users_v2');
    expect(String(mockConnection.query.mock.calls[1][0])).toContain('customer_profiles_v2');
    expect(String(mockConnection.query.mock.calls[2][0])).toContain('roles_v2');
  });

  it('allows a user to update their own v2 profile details', async () => {
    mockConnection.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .put('/api/v2/users/7')
      .set('Cookie', authCookie(7, 'customer'))
      .send({
        first_name: 'Self',
        last_name: 'Updated',
        telephone_number: '5551234',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'User updated',
      affectedRows: 1,
    });

    expect(String(mockConnection.query.mock.calls[0][0])).toContain('customer_profiles_v2');
  });

  it('blocks a customer from updating another users v2 profile', async () => {
    const response = await request(app)
      .put('/api/v2/users/99')
      .set('Cookie', authCookie(7, 'customer'))
      .send({ first_name: 'Nope' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
  });

  it('returns 404 when updating missing v2 user', async () => {
    mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const response = await request(app)
      .put('/api/v2/users/999')
      .set('Cookie', authCookie(1, 'admin'))
      .send({ email_address: 'missing@example.com' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('deletes a v2 user as admin', async () => {
    mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .delete('/api/v2/users/42')
      .set('Cookie', authCookie(1, 'admin'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ affectedRows: 1 });
    expect(String(mockConnection.query.mock.calls[0][0])).toContain('DELETE FROM users_v2');
  });
});