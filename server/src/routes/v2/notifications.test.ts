import jwt from 'jsonwebtoken';
import request from 'supertest';

const mockQuery = jest.fn();

jest.mock('../../ts-common/database', () => ({
  db: {
    query: (...args: unknown[]) => mockQuery(...args),
    getConnection: jest.fn(),
  },
}));

import app from '../../app';

const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

const authCookie = (id: number, role: string) => [
  `auth_token=${jwt.sign({ id, type: role }, JWT_SECRET, { expiresIn: '1h' })}`,
];

describe('v2 notification routes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/v2/notifications');

    expect(response.status).toBe(401);
  });

  it('lists only the current user notifications', async () => {
    mockQuery.mockResolvedValueOnce([
      [
        {
          id: 3,
          type: 'tracking_added',
          title: 'Your order is on its way',
          body: 'Tracking added',
          link: '/profile/7',
          data_json: '{"invoiceId":90}',
          read_at: null,
          created_at: '2026-10-14 09:00:00',
        },
      ],
    ]);

    const response = await request(app)
      .get('/api/v2/notifications')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      id: 3,
      type: 'tracking_added',
      data: { invoiceId: 90 },
      read_at: null,
    });
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE user_id = ?');
    expect(mockQuery.mock.calls[0][1]).toEqual([7, 50, 0]);
  });

  it('filters to unread notifications when requested', async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    await request(app)
      .get('/api/v2/notifications?unread=true&limit=500')
      .set('Cookie', authCookie(7, 'customer'));

    expect(mockQuery.mock.calls[0][0]).toContain('read_at IS NULL');
    expect(mockQuery.mock.calls[0][1]).toEqual([7, 100, 0]);
  });

  it('returns the unread count', async () => {
    mockQuery.mockResolvedValueOnce([[{ unread: 4 }]]);

    const response = await request(app)
      .get('/api/v2/notifications/unread-count')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ unread: 4 });
  });

  it('marks one notification as read for its owner only', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .put('/api/v2/notifications/3/read')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([3, 7]);
  });

  it('returns 404 when the notification belongs to someone else', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const response = await request(app)
      .put('/api/v2/notifications/3/read')
      .set('Cookie', authCookie(8, 'customer'));

    expect(response.status).toBe(404);
  });

  it('rejects an invalid notification id', async () => {
    const response = await request(app)
      .put('/api/v2/notifications/abc/read')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(400);
  });

  it('marks all notifications as read', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 2 }]);

    const response = await request(app)
      .put('/api/v2/notifications/read-all')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(200);
    expect(response.body.affectedRows).toBe(2);
    expect(mockQuery.mock.calls[0][1]).toEqual([7]);
  });
});
