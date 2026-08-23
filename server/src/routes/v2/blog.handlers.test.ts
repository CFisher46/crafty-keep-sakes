import jwt from 'jsonwebtoken';
import request from 'supertest';

const mockConnection = {
  query: jest.fn(),
  release: jest.fn(),
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
  const token = jwt.sign({ id, type: role }, JWT_SECRET, {
    expiresIn: '1h',
  });

  return [`auth_token=${token}`];
};

describe('blog v2 routes', () => {
  beforeEach(() => {
    mockedDbQuery.mockReset();
    mockConnection.query.mockReset();
    mockConnection.release.mockReset();
  });

  it('loads blog posts with comments and reaction counts', async () => {
    mockedDbQuery
      .mockResolvedValueOnce([
        [
          {
            id: 5,
            title: 'Test post',
            summary: 'Intro',
            content: 'Body',
            author_id: 1,
            author_name: 'Admin User',
            created_at: '2026-08-23T12:00:00.000Z',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ id: 9, image_url: '/images/blog-1.png', sort_order: 1 }]])
      .mockResolvedValueOnce([[{ id: 11, user_name: 'Jane', comment: 'Nice post', created_at: '2026-08-23T12:05:00.000Z' }]])
      .mockResolvedValueOnce([[{ count: 3 }]])
      .mockResolvedValueOnce([[{ count: 1 }]]);

    const response = await request(app).get('/api/v2/blog/posts');

    const sql = String(mockedDbQuery.mock.calls[0][0]);
    expect(sql).toContain('TRIM(CONCAT');
    expect(sql).toContain('AS author_name');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      title: 'Test post',
      images: [{ id: 9, image_url: '/images/blog-1.png', sort_order: 1 }],
      comments: [{ comment: 'Nice post' }],
      reaction_counts: { likes: 3, dislikes: 1 },
    });
  });

  it('allows admins to create a blog post', async () => {
    mockedDbQuery
      .mockResolvedValueOnce([{ insertId: 77 }])
      .mockResolvedValueOnce([[{ id: 77 }]]);

    const response = await request(app)
      .post('/api/v2/blog/posts')
      .set('Cookie', authCookie(1, 'admin'))
      .send({
        title: 'Fresh post',
        summary: 'A short summary',
        content: 'The article body',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      message: 'Blog post created',
      post: { title: 'Fresh post', id: 77 },
    });
  });

  it('allows authenticated users to add a comment', async () => {
    mockedDbQuery.mockResolvedValueOnce([{ insertId: 21 }]);

    const response = await request(app)
      .post('/api/v2/blog/posts/5/comments')
      .set('Cookie', authCookie(9, 'customer'))
      .send({
        message: 'I enjoyed this',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      message: 'Comment added',
      comment: { post_id: 5, user_id: 9, comment: 'I enjoyed this' },
    });
  });
});
