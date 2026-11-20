import jwt from 'jsonwebtoken';
import mysql, { Connection } from 'mysql2/promise';
import request from 'supertest';

jest.mock('../../ts-common/auth-account');
jest.mock('../../ts-common/database', () => ({ db: { query: jest.fn() } }));

import app from '../../app';
import { db } from '../../ts-common/database';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- The schema runner is untyped CommonJS.
const { ensureProductReviewSchema } = require('../../../scripts/apply-schema');

const mysqlUrl = process.env.PRODUCT_REVIEW_TEST_MYSQL_URL;
const describeMysql = mysqlUrl ? describe : describe.skip;

describeMysql('product reviews with MySQL', () => {
  let connection: Connection;
  const mockedQuery = db.query as jest.Mock;
  const cookie = `auth_token=${jwt.sign({ id: 7, type: 'customer', token_version: 0 }, process.env.JWT_SECRET || 'your-dev-secret')}`;

  beforeAll(async () => {
    if (!mysqlUrl) throw new Error('PRODUCT_REVIEW_TEST_MYSQL_URL is required');
    connection = await mysql.createConnection(mysqlUrl);
    await connection.query("SET time_zone = '+00:00'");
    await connection.query("SET timestamp = UNIX_TIMESTAMP('2026-04-30 12:00:00')");
    await connection.query(`CREATE TEMPORARY TABLE orders_v2 (
      id BIGINT PRIMARY KEY, user_id BIGINT NOT NULL, order_status VARCHAR(20) NOT NULL, placed_at DATETIME NOT NULL
    )`);
    await connection.query(`CREATE TEMPORARY TABLE order_items_v2 (
      order_id BIGINT NOT NULL, product_id BIGINT NOT NULL
    )`);
    await connection.query(`CREATE TEMPORARY TABLE invoices_v2 (
      order_id BIGINT NOT NULL, invoice_status VARCHAR(20) NOT NULL
    )`);
    await connection.query(`CREATE TEMPORARY TABLE product_reviews_v2 (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, product_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL, order_id BIGINT, star_count INT NOT NULL,
      comment VARCHAR(250) NOT NULL, submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY (user_id, product_id)
    )`);
    await connection.query("INSERT INTO product_reviews_v2 (product_id, user_id, star_count, comment) VALUES (10, 10, 3, 'Legacy')");
    await ensureProductReviewSchema(connection);
    await ensureProductReviewSchema(connection);
    mockedQuery.mockImplementation((sql, values) => connection.query(sql, values));
  });

  afterAll(async () => {
    if (connection) await connection.end();
  });

  beforeEach(async () => {
    await connection.query('DELETE FROM orders_v2');
    await connection.query('DELETE FROM order_items_v2');
    await connection.query('DELETE FROM invoices_v2');
    await connection.query('DELETE FROM product_reviews_v2 WHERE user_id = 7');
  });

  it('preserves legacy overall ratings across repeated schema application', async () => {
    const response = await request(app).get('/api/v2/reviews/products/10/reviews');
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      star_count: 3, match_description_rating: null, quality_rating: null, value_rating: null,
    });
  });

  it.each([
    ['exactly three months', '2026-01-30 12:00:00', 'placed', 'paid', 7, 3, true],
    ['one second outside the window', '2026-01-30 11:59:59', 'placed', 'paid', 7, 3, false],
    ['month-end clamping', '2026-01-31 12:00:00', 'fulfilled', 'paid', 7, 3, true],
    ['future order', '2026-05-01 12:00:00', 'placed', 'paid', 7, 3, false],
    ['unpaid invoice', '2026-04-01 12:00:00', 'placed', 'unpaid', 7, 3, false],
    ['cancelled order', '2026-04-01 12:00:00', 'cancelled', 'paid', 7, 3, false],
    ['another customer', '2026-04-01 12:00:00', 'placed', 'paid', 8, 3, false],
    ['another product', '2026-04-01 12:00:00', 'placed', 'paid', 7, 4, false],
  ])('%s has consistent eligibility and submission', async (_label, placed, status, invoice, user, product, eligible) => {
    await connection.query('INSERT INTO orders_v2 VALUES (?, ?, ?, ?)', [1, user, status, placed]);
    await connection.query('INSERT INTO order_items_v2 VALUES (?, ?)', [1, product]);
    await connection.query('INSERT INTO invoices_v2 VALUES (?, ?)', [1, invoice]);
    const check = await request(app).get('/api/v2/reviews/products/3/eligibility').set('Cookie', cookie);
    expect(check.status).toBe(200);
    expect(check.body.eligible).toBe(eligible);
    const submit = await request(app).post('/api/v2/reviews/products/3/reviews').set('Cookie', cookie).send({
      match_description_rating: 5, quality_rating: 4, value_rating: 3, comment: 'Review',
    });
    expect(submit.status).toBe(eligible ? 201 : 403);
    if (eligible) {
      const listing = await request(app).get('/api/v2/reviews/products/3/reviews');
      expect(listing.body.data[0].star_count).toBe(4);
      const duplicate = await request(app).post('/api/v2/reviews/products/3/reviews').set('Cookie', cookie).send({
        match_description_rating: 5, quality_rating: 4, value_rating: 3, comment: 'Another review',
      });
      expect(duplicate.status).toBe(409);
    }
  });
});
