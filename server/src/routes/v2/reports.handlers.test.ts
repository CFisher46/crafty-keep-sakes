import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('../../ts-common/auth-account');

jest.mock('../../ts-common/database', () => ({
  db: {
    query: jest.fn(),
    getConnection: jest.fn(),
  },
}));

import app from '../../app';
import { db } from '../../ts-common/database';

const mockedDbQuery = db.query as jest.Mock;
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

const authCookie = (id: number, role: string) => {
  const token = jwt.sign({ id, type: role, token_version: 0 }, JWT_SECRET, { expiresIn: '1h' });
  return [`auth_token=${token}`];
};

const admin = authCookie(1, 'admin');

describe('reports v2 routes', () => {
  beforeEach(() => {
    mockedDbQuery.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['overview', 'products', 'users', 'blog'])('%s report requires authentication and the admin role', async (name) => {
    const anonymous = await request(app).get(`/api/v2/reports/${name}`);
    const customer = await request(app).get(`/api/v2/reports/${name}`).set('Cookie', authCookie(5, 'customer'));

    expect(anonymous.status).toBe(401);
    expect(customer.status).toBe(403);
    expect(mockedDbQuery).not.toHaveBeenCalled();
  });

  it.each(['overview', 'products', 'users', 'blog'])('%s report rejects invalid dates', async (name) => {
    const badFormat = await request(app).get(`/api/v2/reports/${name}?from=01/02/2026`).set('Cookie', admin);
    const reversed = await request(app)
      .get(`/api/v2/reports/${name}?from=2026-02-01&to=2026-01-01`)
      .set('Cookie', admin);

    expect(badFormat.status).toBe(400);
    expect(reversed.status).toBe(400);
    expect(mockedDbQuery).not.toHaveBeenCalled();
  });

  describe('GET /overview', () => {
    const mockOverview = () => {
      mockedDbQuery
        .mockResolvedValueOnce([[{ orders: 3, revenue: '45.5', customers: 2 }]])
        .mockResolvedValueOnce([[{ units: '7' }]])
        .mockResolvedValueOnce([[{ new_users: 1 }]])
        .mockResolvedValueOnce([[{ period: '2026-01-02', orders: 2, revenue: '30' }]])
        .mockResolvedValueOnce([[{ product_name: 'Frame', units: '5' }]]);
    };

    it('returns totals, a gap-filled daily series and top products', async () => {
      mockOverview();

      const response = await request(app)
        .get('/api/v2/reports/overview?from=2026-01-01&to=2026-01-04')
        .set('Cookie', admin);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        from: '2026-01-01',
        to: '2026-01-04',
        granularity: 'day',
        totals: { orders: 3, revenue: 45.5, customers: 2, units: 7, new_users: 1 },
        top_products: [{ product_name: 'Frame', units: 5 }],
      });
      expect(response.body.data.series).toEqual([
        { period: '2026-01-01', orders: 0, revenue: 0 },
        { period: '2026-01-02', orders: 2, revenue: 30 },
        { period: '2026-01-03', orders: 0, revenue: 0 },
        { period: '2026-01-04', orders: 0, revenue: 0 },
      ]);
      expect(mockedDbQuery.mock.calls[0][1]).toEqual(['2026-01-01', '2026-01-04']);
    });

    it('groups by month for long ranges', async () => {
      mockOverview();

      const response = await request(app)
        .get('/api/v2/reports/overview?from=2026-01-15&to=2026-06-10')
        .set('Cookie', admin);

      expect(response.body.data.granularity).toBe('month');
      expect(response.body.data.series.map((point: { period: string }) => point.period)).toEqual([
        '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
      ]);
    });

    it('defaults to the last 30 days when no dates are given', async () => {
      mockOverview();

      const response = await request(app).get('/api/v2/reports/overview').set('Cookie', admin);

      expect(response.body.data.series).toHaveLength(30);
      expect(response.body.data.granularity).toBe('day');
    });
  });

  describe('GET /products', () => {
    it('returns sales per product and applies the date range', async () => {
      mockedDbQuery.mockResolvedValueOnce([
        [{ id: 3, sku: 'A1', product_name: 'Frame', stock: 4, units_sold: '6', revenue: '59.5', orders: 2 }],
      ]);

      const response = await request(app)
        .get('/api/v2/reports/products?from=2026-01-01&to=2026-01-31')
        .set('Cookie', admin);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([
        { id: 3, sku: 'A1', product_name: 'Frame', stock: 4, units_sold: 6, revenue: 59.5, orders: 2 },
      ]);
      const [sql, params] = mockedDbQuery.mock.calls[0];
      expect(String(sql)).toContain('o.placed_at >= ?');
      expect(String(sql)).toContain('DATE_ADD(?, INTERVAL 1 DAY)');
      expect(params).toEqual(['2026-01-01', '2026-01-31']);
    });

    it('uses no date parameters when no range is given', async () => {
      mockedDbQuery.mockResolvedValueOnce([[]]);

      await request(app).get('/api/v2/reports/products').set('Cookie', admin);

      expect(mockedDbQuery.mock.calls[0][1]).toEqual([]);
    });

    it('returns 500 when the query fails', async () => {
      mockedDbQuery.mockRejectedValueOnce(new Error('boom'));

      const response = await request(app).get('/api/v2/reports/products').set('Cookie', admin);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /users', () => {
    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const userRow = (id: number, overrides: Record<string, unknown> = {}) => ({
      id,
      email: `u${id}@example.com`,
      status: 'active',
      role_code: 'customer',
      first_name: 'Ada',
      last_name: 'Lovelace',
      created_at: daysAgo(400),
      last_login_at: daysAgo(2),
      orders: 1,
      total_spent: '10',
      last_order_at: null,
      ...overrides,
    });

    it('flags dormant users, including accounts that have never logged in', async () => {
      mockedDbQuery.mockResolvedValueOnce([
        [
          userRow(1, { last_login_at: daysAgo(200) }),
          userRow(2, { last_login_at: null, created_at: daysAgo(300) }),
          userRow(3, { last_login_at: null, created_at: daysAgo(5) }),
          userRow(4),
        ],
      ]);

      const response = await request(app).get('/api/v2/reports/users').set('Cookie', admin);

      expect(response.status).toBe(200);
      expect(response.body.data.inactive_days).toBe(90);
      const dormant = response.body.data.users.map((user: { is_dormant: boolean }) => user.is_dormant);
      expect(dormant).toEqual([true, true, false, false]);
      expect(response.body.data.users[0].name).toBe('Ada Lovelace');
      expect(response.body.data.users[0].days_since_login).toBeGreaterThanOrEqual(199);
    });

    it('honours a custom inactivity threshold and ignores invalid values', async () => {
      mockedDbQuery.mockResolvedValue([[userRow(1, { last_login_at: daysAgo(10) })]]);

      const custom = await request(app).get('/api/v2/reports/users?inactiveDays=7').set('Cookie', admin);
      const invalid = await request(app).get('/api/v2/reports/users?inactiveDays=abc').set('Cookie', admin);

      expect(custom.body.data.inactive_days).toBe(7);
      expect(custom.body.data.users[0].is_dormant).toBe(true);
      expect(invalid.body.data.inactive_days).toBe(90);
    });
  });

  describe('GET /blog', () => {
    it('returns engagement per post and applies the range to every metric', async () => {
      mockedDbQuery.mockResolvedValueOnce([
        [
          {
            id: 9,
            title: 'Hello',
            created_at: new Date('2026-01-01T00:00:00Z'),
            first_name: 'Chris',
            last_name: 'F',
            viewers: 10,
            comments: 3,
            likes: 5,
            dislikes: 1,
          },
        ],
      ]);

      const response = await request(app)
        .get('/api/v2/reports/blog?from=2026-01-01&to=2026-02-01')
        .set('Cookie', admin);

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toMatchObject({
        id: 9,
        title: 'Hello',
        author: 'Chris F',
        viewers: 10,
        comments: 3,
        likes: 5,
        dislikes: 1,
        engagement: 9,
      });
      expect(mockedDbQuery.mock.calls[0][1]).toEqual([
        '2026-01-01', '2026-02-01',
        '2026-01-01', '2026-02-01',
        '2026-01-01', '2026-02-01',
        '2026-01-01', '2026-02-01',
      ]);
    });
  });
});
