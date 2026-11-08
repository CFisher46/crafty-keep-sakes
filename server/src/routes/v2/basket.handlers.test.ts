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
import { db } from '../../ts-common/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

const authCookie = (id: string | number, role: string) => {
  const token = jwt.sign({ id, type: role }, JWT_SECRET, {
    expiresIn: '1h',
  });

  return [`auth_token=${token}`];
};

describe('v2 basket routes', () => {
  beforeEach(() => {
    // A developer's .env may enable payments; these tests assume the default (off)
    delete process.env.PAYMENTS_PROVIDER;
    mockConnection.beginTransaction.mockReset();
    mockConnection.commit.mockReset();
    mockConnection.rollback.mockReset();
    mockConnection.release.mockReset();
    mockConnection.query.mockReset();
    (db.query as jest.Mock).mockReset();
    (db.query as jest.Mock).mockResolvedValue([[]]);
  });

  it('returns 401 for a basket request without auth', async () => {
    const response = await request(app).get('/api/v2/basket');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Not authenticated' });
  });

  it('returns each basket item with its primary image, or null when none exists', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 12 }]])
      .mockResolvedValueOnce([[
        { id: 9, basket_id: 12, product_id: 25, quantity: 2, unit_price_snapshot: '12.50', product_name: 'Tea Set', image_path: '/images/tea.jpg' },
        { id: 10, basket_id: 12, product_id: 26, quantity: 1, unit_price_snapshot: '3.00', product_name: 'Cup', image_path: null },
      ]]);
    const response = await request(app).get('/api/v2/basket').set('Cookie', authCookie(7, 'customer'));
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { image_path: string | null }) => item.image_path)).toEqual(['/images/tea.jpg', null]);
    expect(String(mockConnection.query.mock.calls[1][0])).toContain('ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC LIMIT 1');
  });

  it('adds an item to the active basket for the authenticated customer', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ price: '12.50', on_sale: 0, sale_percent: 0 }]])
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
        unit_price: 0.01,
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

    expect(String(mockConnection.query.mock.calls[0][0])).toContain('FROM products_v2');
    expect(String(mockConnection.query.mock.calls[1][0])).toContain('SELECT id FROM baskets_v2');
    expect(String(mockConnection.query.mock.calls[3][0])).toContain('SELECT id, quantity, unit_price_snapshot FROM basket_items_v2');
    expect(String(mockConnection.query.mock.calls[4][0])).toContain('INSERT INTO basket_items_v2');
    expect(mockConnection.query.mock.calls[4][1]).toEqual([1, 25, 2, 12.5]);
  });

  it('applies the sale discount from the product record and rejects unknown products', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ price: '20.00', on_sale: 1, sale_percent: 25 }]])
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 78 }]);

    const sale = await request(app)
      .post('/api/v2/basket/items')
      .set('Cookie', authCookie(7, 'customer'))
      .send({ product_id: 25, quantity: 1, unit_price: 0 });

    expect(sale.status).toBe(201);
    expect(sale.body.unit_price).toBe(15);

    mockConnection.query.mockReset();
    mockConnection.query.mockResolvedValueOnce([[]]);

    const missing = await request(app)
      .post('/api/v2/basket/items')
      .set('Cookie', authCookie(7, 'customer'))
      .send({ product_id: 999, quantity: 1 });

    expect(missing.status).toBe(400);
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
    (db.query as jest.Mock)
      .mockResolvedValueOnce([[{ user_id: 1 }]])
      .mockResolvedValueOnce([{ insertId: 1 }]);
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
      .mockResolvedValueOnce([[{ Field: 'id' }, { Field: 'order_id' }, { Field: 'invoice_number' }, { Field: 'billing_address_line1' }, { Field: 'billing_address_line2' }, { Field: 'billing_address_line3' }, { Field: 'billing_town' }, { Field: 'billing_county' }, { Field: 'billing_postcode' }]])
      .mockResolvedValueOnce([{ insertId: 40 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 90 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 999 }]);

    const response = await request(app)
      .post('/api/v2/basket/checkout')
      .set('Cookie', authCookie(7, 'customer'))
      .send({
        delivery_address: {
          address_line1: '1 Test Street',
          address_line2: 'Bristol',
          address_line3: '',
          town: 'Bristol',
          county: 'Avon',
          postcode: 'BS1 1AA',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: 'Checkout complete',
      payment_url: null,
      payment_error: false,
      basket_id: 12,
      order_id: 40,
      invoice_id: 90,
      invoice_number: expect.stringMatching(/^INV-/),
      total_due: 25,
      delivery_address: {
        address_line1: '1 Test Street',
        address_line2: 'Bristol',
        address_line3: '',
        town: 'Bristol',
        county: 'Avon',
        postcode: 'BS1 1AA',
      },
    });

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).toHaveBeenCalledTimes(1);
    expect(mockConnection.query.mock.calls.some(([sql]) => String(sql).includes('FROM basket_items_v2'))).toBe(true);
    expect(mockConnection.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO orders_v2'))).toBe(true);
    expect(mockConnection.query.mock.calls.some(([sql]) => String(sql).includes('SHOW COLUMNS FROM invoices_v2'))).toBe(true);
    expect(mockConnection.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO invoices_v2'))).toBe(true);
    const notification = (db.query as jest.Mock).mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO notifications_v2')
    );
    expect(notification?.[1]).toEqual([
      1, 'order_placed', 'New order placed', expect.stringContaining('awaiting payment'),
      '/Reporting/invoices?invoice=90', expect.any(String),
    ]);

    const auditInsertCall = mockConnection.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO audit_events_v2'));
    expect(auditInsertCall).toBeDefined();
    expect(JSON.parse(auditInsertCall[1][7])).toMatchObject({
      order_id: 40,
      invoice_id: 90,
      delivery_address: {
        address_line1: '1 Test Street',
        address_line2: 'Bristol',
        address_line3: '',
        town: 'Bristol',
        county: 'Avon',
        postcode: 'BS1 1AA',
      },
    });
  });

  it.each([false, true])('notifies admins when payment link creation fails: %s', async (paymentLinkFails) => {
    process.env.PAYMENTS_PROVIDER = 'mock';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      mockConnection.query
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 12 }])
        .mockResolvedValueOnce([[{ id: 9, basket_id: 12, product_id: 25, quantity: 2, unit_price_snapshot: '12.50', product_name: 'Tea Set' }]])
        .mockResolvedValueOnce([[{ Field: 'billing_address_line1' }, { Field: 'billing_address_line2' }, { Field: 'billing_address_line3' }, { Field: 'billing_town' }, { Field: 'billing_county' }, { Field: 'billing_postcode' }]])
        .mockResolvedValueOnce([{ insertId: 40 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ insertId: 90 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ insertId: 999 }]);
      (db.query as jest.Mock).mockReset();
      const paymentInsert = (db.query as jest.Mock);
      paymentInsert
        .mockResolvedValueOnce([[{ user_id: 1 }]])
        .mockResolvedValueOnce([{ insertId: 2 }]);
      if (paymentLinkFails) {
        paymentInsert.mockRejectedValueOnce(new Error('Payment link could not be saved'));
      } else {
        paymentInsert.mockResolvedValueOnce([{ insertId: 1 }]);
      }

      const response = await request(app)
        .post('/api/v2/basket/checkout')
        .set('Cookie', authCookie(7, 'customer'))
        .send({ delivery_address: { address_line1: '1 Test Street', town: 'Bristol', postcode: 'BS1 1AA' } });

      expect(response.status).toBe(201);
      expect(response.body.payment_error).toBe(paymentLinkFails);
      if (paymentLinkFails) {
        expect(response.body.payment_url).toBeNull();
        expect(errorSpy).toHaveBeenCalledWith('Create Payment Link Error:', expect.any(Error));
      } else {
        expect(response.body.payment_url).toMatch(/\/payments\/mock\?ref=mock_[a-f0-9]+&invoice=90$/);
      }

      const orderInsert = mockConnection.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO orders_v2'));
      expect(orderInsert?.[1]).toContain('pending');

      const queries = (db.query as jest.Mock).mock.calls.map(([sql]) => String(sql));
      expect(queries.some((sql) => sql.includes('INSERT INTO payments_v2'))).toBe(true);
      expect(mockConnection.commit.mock.invocationCallOrder[0]).toBeLessThan(
        (db.query as jest.Mock).mock.invocationCallOrder[0]
      );
      expect(queries.findIndex((sql) => sql.includes('INSERT INTO notifications_v2'))).toBeLessThan(
        queries.findIndex((sql) => sql.includes('INSERT INTO payments_v2'))
      );
      const notification = (db.query as jest.Mock).mock.calls.find(([sql]) =>
        String(sql).includes('INSERT INTO notifications_v2')
      );
      expect(notification?.[1]).toEqual([
        1, 'order_placed', 'New order placed',
        expect.stringContaining('awaiting payment'),
        '/Reporting/invoices?invoice=90',
        expect.any(String),
      ]);
    } finally {
      delete process.env.PAYMENTS_PROVIDER;
      errorSpy.mockRestore();
    }
  });

  it('adds missing billing columns before writing the invoice when the schema is older', async () => {
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
      .mockResolvedValueOnce([[{ Field: 'id' }, { Field: 'order_id' }, { Field: 'invoice_number' }]])
      .mockResolvedValueOnce([{ insertId: 40 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 90 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 999 }]);

    const response = await request(app)
      .post('/api/v2/basket/checkout')
      .set('Cookie', authCookie(7, 'customer'))
      .send({
        delivery_address: {
          address_line1: '61 Salisbury Avenue',
          address_line2: '',
          address_line3: '',
          town: 'Torquay',
          county: 'Devon',
          postcode: 'TQ2 8AU',
        },
      });

    expect(response.status).toBe(201);
    expect(mockConnection.query.mock.calls.some(([sql]) => String(sql).includes('SHOW COLUMNS FROM invoices_v2'))).toBe(true);
    expect(mockConnection.query.mock.calls.some(([sql]) => String(sql).includes('ALTER TABLE invoices_v2'))).toBe(true);
    expect(mockConnection.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO invoices_v2'))).toBe(true);
  });

  it('lists a customers own orders with invoice references', async () => {
    mockConnection.query.mockResolvedValueOnce([
      [
        {
          id: 40,
          user_id: 7,
          order_status: 'placed',
          grand_total: '30.00',
          placed_at: '2026-08-15 09:00:00',
          invoice_id: 90,
          invoice_number: 'INV-123-40',
          tracking_info: 'RM123',
          has_changes: 1,
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
        invoice_id: 90,
        invoice_number: 'INV-123-40',
        tracking_info: 'RM123',
        has_changes: true,
        placed_at: '2026-08-15 09:00:00',
      },
    ]);
  });

  it('lists every customers orders for an admin', async () => {
    mockConnection.query.mockResolvedValueOnce([
      [
        {
          id: 41,
          user_id: 9,
          order_status: 'placed',
          grand_total: '12.50',
          placed_at: '2026-08-16 10:00:00',
          invoice_id: 91,
          invoice_number: 'INV-123-41',
          invoice_status: 'unpaid',
          first_name: 'Ada',
          last_name: 'Lovelace',
          customer_email: 'ada@example.com',
          has_changes: 1,
        },
      ],
    ]);

    const response = await request(app)
      .get('/api/v2/basket/orders/all')
      .set('Cookie', authCookie(1, 'admin'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 41,
        user_id: 9,
        order_status: 'placed',
        grand_total: 12.5,
        invoice_id: 91,
        invoice_number: 'INV-123-41',
        invoice_status: 'unpaid',
        tracking_info: null,
        has_changes: true,
        customer_name: 'Ada Lovelace',
        customer_email: 'ada@example.com',
        placed_at: '2026-08-16 10:00:00',
      },
    ]);
  });

  it('only flags orders for the requesting user based on their own views', async () => {
    mockConnection.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/v2/basket/orders').set('Cookie', authCookie(7, 'customer'));

    const [sql, params] = mockConnection.query.mock.calls[0];
    expect(String(sql)).toContain('LEFT JOIN invoice_views_v2 v ON v.invoice_id = i.id AND v.user_id = ?');
    expect(String(sql)).toContain('i.updated_at > i.created_at');
    expect(params).toEqual([7, 7]);
  });

  it('flags new orders for an admin using that admins own views', async () => {
    mockConnection.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/v2/basket/orders/all').set('Cookie', authCookie(1, 'admin'));

    const [sql, params] = mockConnection.query.mock.calls[0];
    expect(String(sql)).toContain('v.viewed_at IS NULL');
    expect(String(sql)).toContain('INTERVAL 30 DAY');
    expect(params).toEqual([1]);
  });

  it('blocks customers from listing all orders', async () => {
    const response = await request(app)
      .get('/api/v2/basket/orders/all')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(403);
    expect(mockConnection.query).not.toHaveBeenCalled();
  });

  it('includes invoice items and totals when fetching an invoice', async () => {
    mockConnection.query.mockResolvedValueOnce([
      [
        {
          id: 90,
          order_id: 40,
          invoice_number: 'INV-123-40',
          invoice_status: 'unpaid',
          total_due: '30.00',
          issued_at: '2026-08-15 09:05:00',
          user_id: 7,
          billing_address_line1: '1 Test Street',
          billing_address_line2: 'Bristol',
          billing_address_line3: '',
          billing_town: 'Bristol',
          billing_county: 'Avon',
          billing_postcode: 'BS1 1AA',
          invoice_item_id: 1,
          description: 'Tea Set',
          quantity: 2,
          unit_price: '12.50',
          line_total: '25.00',
        },
        {
          id: 90,
          order_id: 40,
          invoice_number: 'INV-123-40',
          invoice_status: 'unpaid',
          total_due: '30.00',
          issued_at: '2026-08-15 09:05:00',
          user_id: 7,
          billing_address_line1: '1 Test Street',
          billing_address_line2: 'Bristol',
          billing_address_line3: '',
          billing_town: 'Bristol',
          billing_county: 'Avon',
          billing_postcode: 'BS1 1AA',
          invoice_item_id: 2,
          description: 'Coffee Beans',
          quantity: 1,
          unit_price: '5.00',
          line_total: '5.00',
        },
      ],
    ]);

    const response = await request(app)
      .get('/api/v2/basket/invoices/90')
      .set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 90,
      order_id: 40,
      invoice_number: 'INV-123-40',
      invoice_status: 'unpaid',
      total_due: 30,
      tracking_info: '',
      issued_at: '2026-08-15 09:05:00',
      user_id: 7,
      delivery_address: {
        address_line1: '1 Test Street',
        address_line2: 'Bristol',
        address_line3: '',
        town: 'Bristol',
        county: 'Avon',
        postcode: 'BS1 1AA',
      },
      items: [
        {
          id: 1,
          description: 'Tea Set',
          quantity: 2,
          unit_price: 12.5,
          line_total: 25,
        },
        {
          id: 2,
          description: 'Coffee Beans',
          quantity: 1,
          unit_price: 5,
          line_total: 5,
        },
      ],
    });
  });

  it('records that the user has viewed an invoice when they open it', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 90, order_id: 40, invoice_number: 'INV-1', invoice_status: 'unpaid', total_due: '5.00', user_id: 7 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app).get('/api/v2/basket/invoices/90').set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(200);
    const [sql, params] = mockConnection.query.mock.calls[1];
    expect(String(sql)).toContain('INSERT INTO invoice_views_v2');
    expect(params).toEqual([90, 7]);
  });

  it('does not record a view when access is forbidden', async () => {
    mockConnection.query.mockResolvedValueOnce([[{ id: 90, order_id: 40, invoice_number: 'INV-1', invoice_status: 'unpaid', total_due: '5.00', user_id: 99 }]]);

    const response = await request(app).get('/api/v2/basket/invoices/90').set('Cookie', authCookie(7, 'customer'));

    expect(response.status).toBe(403);
    expect(mockConnection.query).toHaveBeenCalledTimes(1);
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

  it('returns 400 when an invalid invoice status is supplied', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[
        {
          order_id: 40,
          invoice_status: 'overdue',
          tracking_info: null,
        },
      ]]);

    const response = await request(app)
      .put('/api/v2/basket/invoices/90')
      .set('Cookie', authCookie(1, 'admin'))
      .send({ invoice_status: 'invalid-status' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid invoice_status',
    });
  });

  it('updates status and tracking together in one request', async () => {
    (db.query as jest.Mock)
      .mockResolvedValueOnce([[{ user_id: 1 }]])
      .mockResolvedValue([{ insertId: 1 }]);
    mockConnection.query
      .mockResolvedValueOnce([[{ order_id: 40, invoice_status: 'unpaid', tracking_info: null, invoice_number: 'INV-1', user_id: 7 }]])
      .mockResolvedValue([{ affectedRows: 1, insertId: 1 }]);

    const response = await request(app)
      .put('/api/v2/basket/invoices/90')
      .set('Cookie', authCookie(1, 'admin'))
      .send({ invoice_status: 'paid', tracking_info: 'RM999' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Invoice updated', affectedRows: 1, statusChanged: true, trackingUpdated: true });
    const sqls = mockConnection.query.mock.calls.map(([sql]) => String(sql));
    expect(sqls.some((sql) => sql.includes('SET invoice_status = ?'))).toBe(true);
    expect(sqls.some((sql) => sql.includes('SET tracking_info = ?'))).toBe(true);
    const notifications = (db.query as jest.Mock).mock.calls.filter(([sql]) =>
      String(sql).includes('INSERT INTO notifications_v2')
    );
    expect(notifications.map(([, params]) => [params[0], params[1]])).toEqual([
      [1, 'order_payment_received'],
      [7, 'invoice_status_changed'],
      [7, 'tracking_added'],
    ]);
  });

  it('does not send payment notifications when an invoice is already paid', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ order_id: 40, invoice_status: 'paid', tracking_info: null, invoice_number: 'INV-1', user_id: 7 }]])
      .mockResolvedValue([{ affectedRows: 1, insertId: 1 }]);

    const response = await request(app)
      .put('/api/v2/basket/invoices/90')
      .set('Cookie', authCookie(1, 'admin'))
      .send({ invoice_status: 'paid' });

    expect(response.status).toBe(200);
    expect(response.body.statusChanged).toBe(false);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('updates the linked order when an invoice is marked paid', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ order_id: 40 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 1200 }]);

    const response = await request(app)
      .put('/api/v2/basket/invoices/90')
      .set('Cookie', authCookie(1, 'admin'))
      .send({ invoice_status: 'paid' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Invoice updated', affectedRows: 1, statusChanged: true, trackingUpdated: false });
    expect(String(mockConnection.query.mock.calls[0][0])).toContain('SELECT i.order_id, i.invoice_status, i.tracking_info');
    expect(String(mockConnection.query.mock.calls[0][0])).toContain('FROM invoices_v2');
    expect(String(mockConnection.query.mock.calls[0][0])).toContain('WHERE i.id = ?');
    expect(String(mockConnection.query.mock.calls[0][0])).toContain('LIMIT 1');
    expect(String(mockConnection.query.mock.calls[1][0])).toContain('UPDATE invoices_v2');
    expect(String(mockConnection.query.mock.calls[2][0])).toContain('UPDATE orders_v2');
    expect(String(mockConnection.query.mock.calls[3][0])).toContain('INSERT INTO audit_events_v2');
    expect(mockConnection.query.mock.calls[2][1]).toEqual(['fulfilled', 40]);
  });

  it('allows an admin to update an invoice status', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ order_id: 40 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 1201 }]);

    const response = await request(app)
      .put('/api/v2/basket/invoices/90')
      .set('Cookie', authCookie(1, 'admin'))
      .send({ invoice_status: 'paid' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Invoice updated', affectedRows: 1, statusChanged: true, trackingUpdated: false });
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
