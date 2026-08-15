import jwt from 'jsonwebtoken';
import request from 'supertest';

const mockConnection = {
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
  query: jest.fn(),
};

jest.mock('../../ts-common/database', () => ({
  db: {
    query: jest.fn(),
    getConnection: jest.fn(async () => mockConnection),
  },
}));

import app from '../../app';

const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

const authCookie = (id: string | number, role: string) => {
  const token = jwt.sign({ id, type: role }, JWT_SECRET, {
    expiresIn: '1h',
  });

  return [`auth_token=${token}`];
};

describe('v2 basket routes', () => {
  beforeEach(() => {
    mockConnection.beginTransaction.mockReset();
    mockConnection.commit.mockReset();
    mockConnection.rollback.mockReset();
    mockConnection.release.mockReset();
    mockConnection.query.mockReset();
  });

  it('returns 401 for a basket request without auth', async () => {
    const response = await request(app).get('/api/v2/basket');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Not authenticated' });
  });

  it('adds an item to the active basket for the authenticated customer', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 1 }])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 77 }]);

    const response = await request(app)
      .post('/api/v2/basket/items')
      .set('Cookie', authCookie(7, 'customer'))
      .send({
        product_id: 25,
        quantity: 2,
        unit_price: 12.5,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: 'Basket item added',
      basket_id: 1,
      id: 77,
      product_id: 25,
      quantity: 2,
      unit_price: 12.5,
    });

    expect(String(mockConnection.query.mock.calls[0][0])).toContain('SELECT id FROM baskets_v2');
    expect(String(mockConnection.query.mock.calls[2][0])).toContain('SELECT id, quantity, unit_price_snapshot FROM basket_items_v2');
    expect(String(mockConnection.query.mock.calls[3][0])).toContain('INSERT INTO basket_items_v2');
  });

  it('updates basket quantity for an existing item', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 11 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .put('/api/v2/basket/items/25')
      .set('Cookie', authCookie(7, 'customer'))
      .send({ quantity: 3 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Basket item updated',
      basket_id: 11,
      product_id: 25,
      quantity: 3,
    });

    expect(String(mockConnection.query.mock.calls[0][0])).toContain('SELECT id FROM baskets_v2');
    expect(String(mockConnection.query.mock.calls[1][0])).toContain('UPDATE basket_items_v2');
  });

  it('removes an item from the basket', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 12 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .delete('/api/v2/basket/items/25')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Basket item removed',
      basket_id: 12,
      product_id: 25,
      affectedRows: 1,
    });
  });

  it('creates order, invoice, and marks basket checked out on successful checkout', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 12 }])
      .mockResolvedValueOnce([
        [
          {
            id: 9,
            basket_id: 12,
            product_id: 25,
            quantity: 2,
            unit_price_snapshot: '12.50',
            product_name: 'Tea Set',
          },
        ],
      ])
      .mockResolvedValueOnce([{ insertId: 40 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 90 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .post('/api/v2/basket/checkout')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: 'Checkout complete',
      basket_id: 12,
      order_id: 40,
      invoice_id: 90,
      invoice_number: expect.stringMatching(/^INV-/),
      total_due: 30,
    });

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).toHaveBeenCalledTimes(1);
    expect(String(mockConnection.query.mock.calls[2][0])).toContain('FROM basket_items_v2');
    expect(String(mockConnection.query.mock.calls[3][0])).toContain('INSERT INTO orders_v2');
    expect(String(mockConnection.query.mock.calls[5][0])).toContain('INSERT INTO invoices_v2');
  });

  it('lists a customers own orders', async () => {
    mockConnection.query.mockResolvedValueOnce([
      [
        {
          id: 40,
          user_id: 7,
          order_status: 'placed',
          grand_total: '30.00',
          placed_at: '2026-08-15 09:00:00',
        },
      ],
    ]);

    const response = await request(app)
      .get('/api/v2/basket/orders')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 40,
        user_id: 7,
        order_status: 'placed',
        grand_total: 30,
        placed_at: '2026-08-15 09:00:00',
      },
    ]);
  });

  it('blocks a customer from viewing another users invoice', async () => {
    mockConnection.query.mockResolvedValueOnce([
      [
        {
          id: 90,
          order_id: 40,
          user_id: 99,
        },
      ],
    ]);

    const response = await request(app)
      .get('/api/v2/basket/invoices/90')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
  });

  it('allows an admin to list all orders', async () => {
    mockConnection.query.mockResolvedValueOnce([
      [
        {
          id: 40,
          user_id: 7,
          order_status: 'placed',
          grand_total: '30.00',
          placed_at: '2026-08-15 09:00:00',
        },
        {
          id: 41,
          user_id: 9,
          order_status: 'fulfilled',
          grand_total: '45.00',
          placed_at: '2026-08-15 10:00:00',
        },
      ],
    ]);

    const response = await request(app)
      .get('/api/v2/basket/orders')
      .set('Cookie', authCookie(1, 'admin'));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].user_id).toBe(7);
    expect(response.body[1].user_id).toBe(9);
  });

  it('allows an admin to update an invoice status', async () => {
    mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .put('/api/v2/basket/invoices/90')
      .set('Cookie', authCookie(1, 'admin'))
      .send({ invoice_status: 'paid' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Invoice updated', affectedRows: 1 });
  });

  it('rolls back checkout when the basket is empty', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 12 }]])
      .mockResolvedValueOnce([[]]);

    const response = await request(app)
      .post('/api/v2/basket/checkout')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Basket is empty' });
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
  });
});
