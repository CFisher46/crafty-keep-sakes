import express, { Request, Response } from 'express';
import request from 'supertest';

jest.mock('./routes/products', () => {
  const router = express.Router();
  router.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({ source: 'legacy-products' });
  });
  return router;
});

jest.mock('./routes/users', () => {
  const router = express.Router();
  router.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({ source: 'legacy-users' });
  });
  return router;
});

jest.mock('./routes/auth', () => {
  const router = express.Router();
  router.get('/me', (_req: Request, res: Response): void => {
    res.status(200).json({ source: 'legacy-auth' });
  });
  return router;
});

jest.mock('./routes/audit', () => {
  const router = express.Router();
  router.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({ source: 'legacy-audit' });
  });
  return router;
});

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

const loadApp = async () => {
  const imported = await import('./app');
  return imported.default;
};

describe('app route source selection', () => {
  afterEach(() => {
    delete process.env.AUTH_API_SOURCE;
    delete process.env.PRODUCTS_API_SOURCE;
    delete process.env.USERS_API_SOURCE;
    delete process.env.AUDIT_API_SOURCE;
    jest.resetModules();
  });

  it('routes canonical auth requests to the v2 auth router when enabled', async () => {
    process.env.AUTH_API_SOURCE = 'v2';
    const app = await loadApp();

    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-auth' });
  });

  it('routes canonical auth requests to the legacy auth router by default', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'legacy-auth' });
  });

  it('keeps the direct v2 auth alias available for isolated verification', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/v2/auth/me');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-auth' });
  });

  it('routes canonical products requests to the v2 products router when enabled', async () => {
    process.env.PRODUCTS_API_SOURCE = 'v2';
    const app = await loadApp();

    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-products' });
  });

  it('routes canonical products requests to the v2 products router by default', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-products' });
  });

  it('routes canonical products requests to the legacy products router when explicitly set', async () => {
    process.env.PRODUCTS_API_SOURCE = 'legacy';
    const app = await loadApp();

    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'legacy-products' });
  });

  it('keeps the direct v2 products alias available for isolated verification', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/v2/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-products' });
  });

  it('routes canonical users requests to the v2 users router when enabled', async () => {
    process.env.USERS_API_SOURCE = 'v2';
    const app = await loadApp();

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-users' });
  });

  it('routes canonical users requests to the v2 users router by default', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-users' });
  });

  it('keeps the direct v2 users alias available for isolated verification', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/v2/users');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-users' });
  });

  it('routes canonical audit requests to the v2 audit router when enabled', async () => {
    process.env.AUDIT_API_SOURCE = 'v2';
    const app = await loadApp();

    const response = await request(app).get('/api/audit');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-audit' });
  });

  it('routes canonical audit requests to the legacy audit router by default', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/audit');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'legacy-audit' });
  });

  it('keeps the direct v2 audit alias available for isolated verification', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/v2/audit');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'v2-audit' });
  });
});
