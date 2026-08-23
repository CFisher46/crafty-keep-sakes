import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('../../ts-common/database', () => ({
  db: {
    query: jest.fn(),
  },
}));

import app from '../../app';
import { db } from '../../ts-common/database';

const mockedDbQuery = db.query as jest.Mock;
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

const authCookie = (id: string | number, role: string) => {
  const token = jwt.sign({ id, type: role }, JWT_SECRET, {
    expiresIn: '1h',
  });

  return [`auth_token=${token}`];
};

describe('v2 audit read routes', () => {
  beforeEach(() => {
    mockedDbQuery.mockReset();
  });

  it('requires admin access for audit reads', async () => {
    const response = await request(app).get('/api/v2/audit');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Not authenticated' });
  });

  it('applies filters and pagination for admin audit reads', async () => {
    mockedDbQuery
      .mockResolvedValueOnce([[{ total_count: 2 }]])
      .mockResolvedValueOnce([
        [
          {
            id: 11,
            actor_user_id: 3,
            actor_role: 'admin',
            action_type: 'CREATE',
            resource_type: 'product',
            resource_id: '42',
            source_endpoint: '/api/v2/products',
            old_values_json: null,
            new_values_json: JSON.stringify({ id: 42 }),
            created_at: '2026-08-23T12:00:00.000Z',
          },
          {
            id: 12,
            actor_user_id: 3,
            actor_role: 'admin',
            action_type: 'CREATE',
            resource_type: 'product',
            resource_id: '43',
            source_endpoint: '/api/v2/products',
            old_values_json: null,
            new_values_json: JSON.stringify({ id: 43 }),
            created_at: '2026-08-23T12:05:00.000Z',
          },
        ],
      ]);

    const response = await request(app)
      .get('/api/v2/audit?resource_type=product&action_type=CREATE&page=2&pageSize=10')
      .set('Cookie', authCookie(1, 'admin'));

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total_count', 2);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(2);

    const countSql = String(mockedDbQuery.mock.calls[0][0]);
    expect(countSql).toContain('COUNT(*) AS total_count');
    expect(countSql).toContain('resource_type = ?');
    expect(countSql).toContain('action_type = ?');

    const rowSql = String(mockedDbQuery.mock.calls[1][0]);
    expect(rowSql).toContain('LIMIT ?');
    expect(rowSql).toContain('OFFSET ?');
  });
});
