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

const authCookie = (role: string) => {
  const token = jwt.sign({ id: 1, type: role }, JWT_SECRET, {
    expiresIn: '1h',
  });
  return [`auth_token=${token}`];
};

describe('v2 product write routes', () => {
  beforeEach(() => {
    mockConnection.beginTransaction.mockReset();
    mockConnection.commit.mockReset();
    mockConnection.rollback.mockReset();
    mockConnection.release.mockReset();
    mockConnection.query.mockReset();
  });

  it('returns 401 for unauthenticated create request', async () => {
    const response = await request(app).post('/api/v2/products').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Not authenticated' });
  });

  it('returns 403 for non-admin create request', async () => {
    const response = await request(app)
      .post('/api/v2/products')
      .set('Cookie', authCookie('customer'))
      .send({});

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
  });

  it('creates v2 product as admin', async () => {
    mockConnection.query
      .mockResolvedValueOnce([{ insertId: 101 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 7 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 900 }]);

    const response = await request(app)
      .post('/api/v2/products')
      .set('Cookie', authCookie('admin'))
      .send({
        id: 'SKU-101',
        category: 'Computers',
        description: 'Portable computer',
        price: 200,
        quantity: 5,
        on_sale: true,
        product_name: 'Laptop',
        is_live: true,
        sale_percent: 10,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: 'Product created',
      insertId: 101,
    });

    const firstSql = String(mockConnection.query.mock.calls[0][0]);
    const auditSql = String(mockConnection.query.mock.calls[4][0]);
    expect(firstSql).toContain('INSERT INTO products_v2');
    expect(auditSql).toContain('INSERT INTO audit_events_v2');
  });

  it('returns 400 for invalid create payload', async () => {
    const response = await request(app)
      .post('/api/v2/products')
      .set('Cookie', authCookie('admin'))
      .send({
        id: 'SKU-400',
        category: 'Computers',
        description: 'bad payload',
        price: 'abc',
        quantity: 5,
        on_sale: true,
        product_name: 'Broken Laptop',
        is_live: true,
        sale_percent: 10,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid price' });
  });

  it('updates mutable fields in v2 as admin', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 101 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 901 }]);

    const response = await request(app)
      .put('/api/v2/products/101')
      .set('Cookie', authCookie('admin'))
      .send({
        price: 250,
        quantity: 3,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Product updated',
      affectedRows: 1,
    });

    const updateSql = String(mockConnection.query.mock.calls[1][0]);
    const auditSql = String(mockConnection.query.mock.calls[2][0]);
    expect(updateSql).toContain('UPDATE products_v2');
    expect(auditSql).toContain('INSERT INTO audit_events_v2');
  });

  it('returns 404 when updating unknown product', async () => {
    mockConnection.query.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .put('/api/v2/products/not-found')
      .set('Cookie', authCookie('admin'))
      .send({ price: 100 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Product not found' });
  });

  it('returns 400 when update has no mutable fields', async () => {
    const response = await request(app)
      .put('/api/v2/products/101')
      .set('Cookie', authCookie('admin'))
      .send({ id: 'SKU-101' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'No mutable fields to update' });
  });

  it('uploads images into v2 product_images_v2', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 101 }]])
      .mockResolvedValueOnce([[{ max_sort: -1 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .post('/api/v2/products/101/images/upload')
      .set('Cookie', authCookie('admin'))
      .attach('images', Buffer.from('file-data'), 'sample.png');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'Images uploaded');
    expect(Array.isArray(response.body.images)).toBe(true);

    const insertSql = String(mockConnection.query.mock.calls[2][0]);
    expect(insertSql).toContain('INSERT INTO product_images_v2');
  });
});
