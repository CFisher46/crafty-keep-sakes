import express from 'express';
import request from 'supertest';
import { originGuard } from './origin-guard';

const buildApp = () => {
  const app = express();
  app.use(originGuard);
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/v2/payments/webhook', (_req, res) => res.json({ ok: true }));
  app.get('/api/v2/products', (req, res) => res.json({ ip: req.ip }));
  return app;
};

describe('originGuard', () => {
  const original = process.env.ORIGIN_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.ORIGIN_SECRET;
    else process.env.ORIGIN_SECRET = original;
  });

  it('is inactive when ORIGIN_SECRET is not set', async () => {
    delete process.env.ORIGIN_SECRET;

    const response = await request(buildApp()).get('/api/v2/products');

    expect(response.status).toBe(200);
  });

  it('rejects requests without the secret header', async () => {
    process.env.ORIGIN_SECRET = 'a-long-origin-secret';

    const response = await request(buildApp()).get('/api/v2/products');

    expect(response.status).toBe(403);
  });

  it('rejects requests with a wrong secret', async () => {
    process.env.ORIGIN_SECRET = 'a-long-origin-secret';

    const response = await request(buildApp()).get('/api/v2/products').set('X-Origin-Secret', 'nope');

    expect(response.status).toBe(403);
  });

  it('allows the health check and the Square webhook without the secret', async () => {
    process.env.ORIGIN_SECRET = 'a-long-origin-secret';
    const app = buildApp();

    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).post('/api/v2/payments/webhook')).status).toBe(200);
  });

  it('uses CF-Connecting-IP as the client IP only with a valid secret', async () => {
    process.env.ORIGIN_SECRET = 'a-long-origin-secret';

    const response = await request(buildApp())
      .get('/api/v2/products')
      .set('X-Origin-Secret', 'a-long-origin-secret')
      .set('CF-Connecting-IP', '203.0.113.9');

    expect(response.status).toBe(200);
    expect(response.body.ip).toBe('203.0.113.9');
  });

  it('ignores a spoofed CF-Connecting-IP when the secret is not set', async () => {
    delete process.env.ORIGIN_SECRET;

    const response = await request(buildApp())
      .get('/api/v2/products')
      .set('CF-Connecting-IP', '203.0.113.9');

    expect(response.body.ip).not.toBe('203.0.113.9');
  });
});
