import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('../../ts-common/auth-account');

const mockConnection = {
  query: jest.fn(),
  release: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
};

jest.mock('../../ts-common/database', () => ({
  db: {
    query: jest.fn(),
    getConnection: jest.fn(async () => mockConnection),
  },
}));

import app from '../../app';
import { db } from '../../ts-common/database';

const mockedDbQuery = db.query as jest.Mock;
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

const authCookie = (id: string | number, role: string) => {
  const token = jwt.sign({ id, type: role, token_version: 0 }, JWT_SECRET, { expiresIn: '1h' });
  return [`auth_token=${token}`];
};

const validReview = {
  reviewer_name: 'Jane Doe',
  source: 'Facebook',
  star_count: 5,
  comment: 'Lovely work',
  submit_date: '2026-06-05',
};

const existingRow = {
  id: 4,
  reviewer_name: 'Jane Doe',
  source: 'Facebook',
  star_count: 5,
  comment: 'Lovely work',
  submit_date: '2026-06-05T00:00:00.000Z',
};

const sqlOf = (call: unknown[]) => String(call[0]);

describe('reviews v2 routes', () => {
  beforeEach(() => {
    mockedDbQuery.mockReset();
    Object.values(mockConnection).forEach((fn) => fn.mockReset());
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v2/reviews', () => {
    it('lists reviews for guests', async () => {
      mockedDbQuery.mockResolvedValueOnce([[existingRow]]);

      const response = await request(app).get('/api/v2/reviews');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([{ ...existingRow, submit_date: '2026-06-05' }]);
      expect(sqlOf(mockedDbQuery.mock.calls[0])).toContain('FROM reviews_v2');
    });

    it('returns the stored calendar date regardless of timezone', async () => {
      mockedDbQuery.mockResolvedValueOnce([[{ ...existingRow, submit_date: new Date(2026, 5, 5) }]]);

      const response = await request(app).get('/api/v2/reviews');

      expect(response.body.data[0].submit_date).toBe('2026-06-05');
    });

    it('returns a 500 when the database fails', async () => {
      mockedDbQuery.mockRejectedValueOnce(new Error('db down'));

      const response = await request(app).get('/api/v2/reviews');

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/v2/reviews', () => {
    it('rejects guests', async () => {
      const response = await request(app).post('/api/v2/reviews').send(validReview);

      expect(response.status).toBe(401);
    });

    it('rejects customers', async () => {
      const response = await request(app)
        .post('/api/v2/reviews')
        .set('Cookie', authCookie(7, 'customer'))
        .send(validReview);

      expect(response.status).toBe(403);
      expect(mockConnection.query).not.toHaveBeenCalled();
    });

    it('creates a review and records an audit event for admins', async () => {
      mockConnection.query.mockResolvedValue([{ insertId: 12 }]);

      const response = await request(app)
        .post('/api/v2/reviews')
        .set('Cookie', authCookie(1, 'admin'))
        .send(validReview);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: 'Review created', insertId: 12 });
      expect(sqlOf(mockConnection.query.mock.calls[0])).toContain('INSERT INTO reviews_v2');
      expect(mockConnection.query.mock.calls[0][1].slice(0, 2)).toEqual(['Jane Doe', 'Facebook']);
      expect(mockConnection.query.mock.calls[0][1].slice(3)).toEqual([5, 'Lovely work']);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(JSON.stringify(mockConnection.query.mock.calls[1])).toContain('reviews_v2');
    });

    it.each([
      ['a star count above 5', { star_count: 6 }, 'star_count'],
      ['a star count of 0', { star_count: 0 }, 'star_count'],
      ['a missing comment', { comment: '   ' }, 'comment'],
      ['a missing reviewer name', { reviewer_name: '' }, 'reviewer_name'],
      ['an over-long source', { source: 'x'.repeat(46) }, 'source'],
      ['an invalid date', { submit_date: 'not-a-date' }, 'submit_date'],
      ['an impossible date', { submit_date: '2026-02-31' }, 'submit_date'],
    ])('rejects %s', async (_label, override, field) => {
      const response = await request(app)
        .post('/api/v2/reviews')
        .set('Cookie', authCookie(1, 'admin'))
        .send({ ...validReview, ...override });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain(field);
      expect(mockConnection.query).not.toHaveBeenCalled();
    });

    it('rolls back when the insert fails', async () => {
      mockConnection.query.mockRejectedValueOnce(new Error('db down'));

      const response = await request(app)
        .post('/api/v2/reviews')
        .set('Cookie', authCookie(1, 'admin'))
        .send(validReview);

      expect(response.status).toBe(500);
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v2/reviews/:id', () => {
    it('rejects customers', async () => {
      const response = await request(app)
        .put('/api/v2/reviews/4')
        .set('Cookie', authCookie(7, 'customer'))
        .send({ comment: 'Edited' });

      expect(response.status).toBe(403);
    });

    it('updates only the supplied fields', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[existingRow]])
        .mockResolvedValue([{ affectedRows: 1 }]);

      const response = await request(app)
        .put('/api/v2/reviews/4')
        .set('Cookie', authCookie(1, 'admin'))
        .send({ comment: 'Edited', star_count: 4 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Review updated', id: 4 });
      const updateCall = mockConnection.query.mock.calls[1];
      expect(sqlOf(updateCall)).toContain('SET comment = ?, star_count = ?');
      expect(updateCall[1]).toEqual(['Edited', 4, 4]);
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('returns 404 when the review does not exist', async () => {
      mockConnection.query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .put('/api/v2/reviews/99')
        .set('Cookie', authCookie(1, 'admin'))
        .send({ comment: 'Edited' });

      expect(response.status).toBe(404);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('rejects an empty update', async () => {
      const response = await request(app)
        .put('/api/v2/reviews/4')
        .set('Cookie', authCookie(1, 'admin'))
        .send({});

      expect(response.status).toBe(400);
    });

    it('rejects an invalid id', async () => {
      const response = await request(app)
        .put('/api/v2/reviews/abc')
        .set('Cookie', authCookie(1, 'admin'))
        .send({ comment: 'Edited' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid review id');
    });

    it('rejects an invalid star count', async () => {
      const response = await request(app)
        .put('/api/v2/reviews/4')
        .set('Cookie', authCookie(1, 'admin'))
        .send({ star_count: 9 });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v2/reviews/:id', () => {
    it('rejects customers', async () => {
      const response = await request(app)
        .delete('/api/v2/reviews/4')
        .set('Cookie', authCookie(7, 'customer'));

      expect(response.status).toBe(403);
    });

    it('deletes a review and records an audit event', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[existingRow]])
        .mockResolvedValue([{ affectedRows: 1 }]);

      const response = await request(app)
        .delete('/api/v2/reviews/4')
        .set('Cookie', authCookie(1, 'admin'));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Review deleted', id: 4 });
      expect(sqlOf(mockConnection.query.mock.calls[1])).toContain('DELETE FROM reviews_v2');
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('returns 404 when the review does not exist', async () => {
      mockConnection.query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .delete('/api/v2/reviews/99')
        .set('Cookie', authCookie(1, 'admin'));

      expect(response.status).toBe(404);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('rejects an invalid id', async () => {
      const response = await request(app)
        .delete('/api/v2/reviews/0')
        .set('Cookie', authCookie(1, 'admin'));

      expect(response.status).toBe(400);
    });
  });
});
