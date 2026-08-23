import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from './app';
import { db } from './ts-common/database';
import { ACTIVE_ENDPOINTS, ENDPOINT_INVENTORY } from './endpoint-inventory';

jest.mock('./ts-common/database', () => ({
  db: {
    query: jest.fn(),
    getConnection: jest.fn(),
  },
}));

const mockedDbQuery = db.query as jest.Mock;
const mockedGetConnection = db.getConnection as jest.Mock;
const mockedConnection = {
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
  query: jest.fn(),
};
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

const authCookie = (id: string | number, role: string) => {
  const token = jwt.sign({ id, type: role }, JWT_SECRET, {
    expiresIn: '1h',
  });

  return [`auth_token=${token}`];
};

describe('endpoint inventory', () => {
  beforeEach(() => {
    mockedDbQuery.mockReset();
    mockedGetConnection.mockReset();
    mockedGetConnection.mockResolvedValue(mockedConnection);
    mockedConnection.beginTransaction.mockReset();
    mockedConnection.commit.mockReset();
    mockedConnection.rollback.mockReset();
    mockedConnection.release.mockReset();
    mockedConnection.query.mockReset();
  });

  it('groups the active routes by domain and required permission level', () => {
    expect(ACTIVE_ENDPOINTS.auth.public).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'auth',
          method: 'POST',
          path: '/api/auth/login',
          role: 'public',
        }),
      ])
    );

    expect(ACTIVE_ENDPOINTS.products.admin).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'products',
          path: '/api/products',
          method: 'POST',
          role: 'admin',
        }),
      ])
    );

    expect(ACTIVE_ENDPOINTS.users.admin).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'users',
          path: '/api/users',
          method: 'GET',
          role: 'admin',
        }),
      ])
    );

    expect(ACTIVE_ENDPOINTS.audit.admin).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'audit',
          path: '/api/audit',
          method: 'GET',
          role: 'admin',
        }),
      ])
    );

    expect(ACTIVE_ENDPOINTS.basket.authenticated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'basket',
          path: '/api/basket/checkout',
          method: 'POST',
          role: 'authenticated',
        }),
      ])
    );
  });

  it('records the critical canonical route set for the active migration surface', () => {
    const paths = ENDPOINT_INVENTORY.map((endpoint) => `${endpoint.method} ${endpoint.path}`);

    expect(paths).toEqual(
      expect.arrayContaining([
        'POST /api/auth/login',
        'GET /api/auth/me',
        'GET /api/products',
        'GET /api/products/filter',
        'GET /api/users',
        'GET /api/audit',
        'POST /api/basket/checkout',
      ])
    );

    const uniqueMethodsAndPaths = new Set(paths);
    expect(uniqueMethodsAndPaths.size).toBe(paths.length);
  });

  it('requires authentication for protected routes and allows public reads', async () => {
    mockedDbQuery.mockResolvedValueOnce([[]]);

    const publicResponse = await request(app).get('/api/products');
    expect(publicResponse.status).toBe(200);

    const unauthenticatedUsersResponse = await request(app).get('/api/v2/users');
    expect(unauthenticatedUsersResponse.status).toBe(401);
    expect(unauthenticatedUsersResponse.body).toEqual({ error: 'Not authenticated' });

    const unauthenticatedAuditResponse = await request(app).get('/api/v2/audit');
    expect(unauthenticatedAuditResponse.status).toBe(401);
    expect(unauthenticatedAuditResponse.body).toEqual({ error: 'Not authenticated' });
  });

  it('blocks non-admin users from admin-only routes', async () => {
    const customerCookie = authCookie(5, 'customer');

    const usersResponse = await request(app)
      .get('/api/v2/users')
      .set('Cookie', customerCookie);
    expect(usersResponse.status).toBe(403);
    expect(usersResponse.body).toEqual({ error: 'Forbidden' });

    const auditResponse = await request(app)
      .get('/api/v2/audit')
      .set('Cookie', customerCookie);
    expect(auditResponse.status).toBe(403);
    expect(auditResponse.body).toEqual({ error: 'Forbidden' });

    const productCreateResponse = await request(app)
      .post('/api/v2/products')
      .set('Cookie', customerCookie)
      .send({ name: 'Test product' });
    expect(productCreateResponse.status).toBe(403);
    expect(productCreateResponse.body).toEqual({ error: 'Forbidden' });
  });

  it('allows the owner to access their own profile and blocks another user', async () => {
    mockedDbQuery.mockResolvedValueOnce([
      [
        {
          id: 7,
          email: 'customer@example.com',
          status: 'active',
          first_name: 'Grace',
          last_name: 'Hopper',
          address_line1: '',
          address_line2: '',
          address_line3: '',
          town: '',
          county: '',
          postcode: '',
          telephone_number: '',
          type: 'customer',
        },
      ],
    ]);

    const allowedResponse = await request(app)
      .get('/api/v2/users/7')
      .set('Cookie', authCookie(7, 'customer'));
    expect(allowedResponse.status).toBe(200);
    expect(allowedResponse.body).toMatchObject({
      id: '7',
      email_address: 'customer@example.com',
      type: 'customer',
    });

    const blockedResponse = await request(app)
      .get('/api/v2/users/9')
      .set('Cookie', authCookie(7, 'customer'));
    expect(blockedResponse.status).toBe(403);
    expect(blockedResponse.body).toEqual({ error: 'Forbidden' });
  });

  it('returns 400 for malformed validation payloads on the active write endpoints', async () => {
    const missingUserFields = await request(app)
      .post('/api/v2/users')
      .set('Cookie', authCookie(1, 'admin'))
      .send({ email_address: 'invalid@example.com' });

    expect(missingUserFields.status).toBe(400);
    expect(missingUserFields.body).toEqual({ error: 'Missing required user fields' });

    const invalidProduct = await request(app)
      .post('/api/v2/products')
      .set('Cookie', authCookie(1, 'admin'))
      .send({
        product_name: 'Broken Product',
        category: 'Tools',
        description: 'desc',
        price: 'not-a-number',
        quantity: 'bad',
        on_sale: 'yes',
        is_live: true,
        sale_percent: 0,
        images: '',
      });

    expect(invalidProduct.status).toBe(400);
    expect(invalidProduct.body).toEqual({ error: 'Invalid price' });

    const emptyProductUpdate = await request(app)
      .put('/api/v2/products/101')
      .set('Cookie', authCookie(1, 'admin'))
      .send({});

    expect(emptyProductUpdate.status).toBe(400);
    expect(emptyProductUpdate.body).toEqual({ error: 'No mutable fields to update' });
  });

  it('keeps the critical response contracts stable across top-level migration endpoints', async () => {
    mockedDbQuery
      .mockResolvedValueOnce([
        [
          {
            result: JSON.stringify({
              total_count: 1,
              data: JSON.stringify([
                {
                  id: 1,
                  category: 'Crafts',
                  product_name: 'Blue Mug',
                  images: JSON.stringify(['/images/mug.jpg']),
                  price: 12.5,
                  is_live: true,
                },
              ]),
            }),
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 7,
            email: 'customer@example.com',
            status: 'active',
            first_name: 'Grace',
            last_name: 'Hopper',
            address_line1: '',
            address_line2: '',
            address_line3: '',
            town: '',
            county: '',
            postcode: '',
            telephone_number: '',
            type: 'customer',
          },
        ],
      ])
      .mockResolvedValueOnce([
        [{ total_count: 1 }],
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 99,
            actor_user_id: 1,
            actor_role: 'admin',
            action_type: 'CREATE',
            resource_type: 'products_v2',
            resource_id: 1,
            source_endpoint: 'POST /api/v2/products',
            old_values_json: null,
            new_values_json: JSON.stringify({ id: 1, product_name: 'Blue Mug' }),
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      ]);

    mockedConnection.query
      .mockResolvedValueOnce([
        [
          {
            id: 11,
            user_id: 7,
            order_status: 'fulfilled',
            subtotal: 12.5,
            discount_total: 0,
            tax_total: 0,
            grand_total: 12.5,
            placed_at: '2026-01-01T00:00:00.000Z',
            invoice_id: 55,
            invoice_number: 'INV-000055',
          },
        ],
      ]);

    const productResponse = await request(app).get('/api/v2/products');
    expect(productResponse.status).toBe(200);
    expect(productResponse.body).toHaveProperty('total_count', 1);
    expect(productResponse.body.data).toEqual(expect.any(String));

    const userResponse = await request(app)
      .get('/api/v2/users/7')
      .set('Cookie', authCookie(7, 'customer'));
    expect(userResponse.status).toBe(200);
    expect(userResponse.body).toMatchObject({
      id: '7',
      email_address: 'customer@example.com',
      type: 'customer',
      status: 'active',
    });

    const basketResponse = await request(app)
      .get('/api/v2/basket/orders')
      .set('Cookie', authCookie(7, 'customer'));
    expect(basketResponse.status).toBe(200);
    expect(Array.isArray(basketResponse.body)).toBe(true);
    expect(basketResponse.body[0]).toMatchObject({
      id: 11,
      user_id: 7,
      order_status: 'fulfilled',
      grand_total: 12.5,
      invoice_number: 'INV-000055',
    });

    const auditResponse = await request(app)
      .get('/api/v2/audit')
      .set('Cookie', authCookie(1, 'admin'));
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body).toHaveProperty('total_count', 1);
    expect(Array.isArray(auditResponse.body.data)).toBe(true);
    expect(auditResponse.body.data[0]).toHaveProperty('resource_type', 'products_v2');
  });

  it('runs the critical canary smoke bundle for login, product, basket, and audit flows', async () => {
    process.env.AUTH_SOURCE = 'v2';
    const passwordHash = await bcrypt.hash('Password123!', 10);

    mockedDbQuery
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            email: 'admin@example.com',
            password_hash: passwordHash,
            status: 'active',
            first_name: 'Ada',
            last_name: 'Lovelace',
            role_code: 'admin',
            address_line1: '',
            address_line2: '',
            address_line3: '',
            town: '',
            county: '',
            postcode: '',
            telephone_number: '',
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            result: JSON.stringify({
              total_count: 1,
              data: JSON.stringify([
                {
                  id: 1,
                  product_name: 'Blue Mug',
                  category: 'Crafts',
                  images: JSON.stringify(['/images/mug.jpg']),
                },
              ]),
            }),
          },
        ],
      ])
      .mockResolvedValueOnce([
        [{ total_count: 1 }],
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 99,
            actor_user_id: 1,
            actor_role: 'admin',
            action_type: 'CREATE',
            resource_type: 'audit_events_v2',
            resource_id: 1,
            source_endpoint: 'GET /api/v2/audit',
            old_values_json: null,
            new_values_json: JSON.stringify({ request: 'smoke-test' }),
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      ]);

    mockedConnection.query
      .mockResolvedValueOnce([
        [
          {
            id: 12,
            user_id: 1,
            order_status: 'fulfilled',
            grand_total: 14.99,
            invoice_id: 77,
            invoice_number: 'INV-000077',
            placed_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      ]);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Password123!',
        rememberMe: false,
      });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('message', 'Login successful');

    const productsResponse = await request(app).get('/api/v2/products');
    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body).toHaveProperty('total_count', 1);

    const orderResponse = await request(app)
      .get('/api/v2/basket/orders')
      .set('Cookie', authCookie(1, 'admin'));
    expect(orderResponse.status).toBe(200);
    expect(Array.isArray(orderResponse.body)).toBe(true);

    const auditResponse = await request(app)
      .get('/api/v2/audit')
      .set('Cookie', authCookie(1, 'admin'));
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body).toHaveProperty('total_count', 1);
    expect(Array.isArray(auditResponse.body.data)).toBe(true);
  });
});
