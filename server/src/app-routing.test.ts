import express, { Request, Response } from 'express';
import request from 'supertest';

jest.mock('./routes/v2/products', () => {
  const router = express.Router();
  router.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({ source: 'v2-products' });
  });
  return router;
});

jest.mock('./routes/v2/users', () => {
  const router = express.Router();
  router.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({ source: 'v2-users' });
  });
  return router;
});

jest.mock('./routes/v2/auth', () => {
  const router = express.Router();
  router.get('/me', (_req: Request, res: Response): void => {
    res.status(200).json({ source: 'v2-auth' });
  });
  return router;
});

jest.mock('./routes/v2/audit', () => {
  const router = express.Router();
  router.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({ source: 'v2-audit' });
  });
  return router;
});

jest.mock('./routes/v2/basket', () => {
  const router = express.Router();
  router.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({ source: 'v2-basket' });
  });
  return router;
});

const loadApp = async () => {
  const imported = await import('./app');
  return imported.default;
};

describe('app v2 route registration', () => {
  afterEach(() => {
    delete process.env.AUTH_API_SOURCE;
    delete process.env.PRODUCTS_API_SOURCE;
    delete process.env.USERS_API_SOURCE;
    delete process.env.AUDIT_API_SOURCE;
    delete process.env.BASKET_API_SOURCE;
    jest.resetModules();
  });

  it('routes canonical auth requests to the v2 auth router', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-auth' });
  });

  it('routes canonical products requests to the v2 products router', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-products' });
  });

  it('routes canonical users requests to the v2 users router', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-users' });
  });

  it('routes canonical audit requests to the v2 audit router', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/audit');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-audit' });
  });

  it('routes canonical basket requests to the v2 basket router', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/basket');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-basket' });
  });

  it('keeps the direct v2 aliases available for isolated verification', async () => {
    const app = await loadApp();

    expect((await request(app).get('/api/v2/auth/me')).body).toEqual({ source: 'v2-auth' });
    expect((await request(app).get('/api/v2/products')).body).toEqual({ source: 'v2-products' });
    expect((await request(app).get('/api/v2/users')).body).toEqual({ source: 'v2-users' });
    expect((await request(app).get('/api/v2/audit')).body).toEqual({ source: 'v2-audit' });
    expect((await request(app).get('/api/v2/basket')).body).toEqual({ source: 'v2-basket' });
  });
});
