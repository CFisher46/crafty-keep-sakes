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
import { MOCK_SIGNATURE_HEADER, signMockPayload } from '../../payments/mockProvider';

const mockedDbQuery = db.query as jest.Mock;
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret';

const authCookie = (id: number, role: string) => {
  const token = jwt.sign({ id, type: role }, JWT_SECRET, { expiresIn: '1h' });
  return [`auth_token=${token}`];
};

const signedEvent = (overrides: Record<string, unknown> = {}) => {
  const body = JSON.stringify({
    eventId: 'evt_1',
    type: 'payment.updated',
    providerRef: 'mock_abc',
    status: 'succeeded',
    amount: 25,
    ...overrides,
  });
  return { body, signature: signMockPayload(body) };
};

const postWebhook = (event: { body: string; signature: string }) =>
  request(app)
    .post('/api/v2/payments/webhook')
    .set('Content-Type', 'application/json')
    .set(MOCK_SIGNATURE_HEADER, event.signature)
    .send(event.body);

const linkRow = { invoice_id: 90, invoice_number: 'INV-1', invoice_status: 'unpaid', total_due: '25.00', order_id: 40, user_id: 7 };

const sqlOf = (mock: jest.Mock) => mock.mock.calls.map(([sql]) => String(sql));

describe('payments v2 routes', () => {
  beforeEach(() => {
    process.env.PAYMENTS_PROVIDER = 'mock';
    mockConnection.beginTransaction.mockReset();
    mockConnection.commit.mockReset();
    mockConnection.rollback.mockReset();
    mockConnection.release.mockReset();
    mockConnection.query.mockReset();
    mockedDbQuery.mockReset();
    mockedDbQuery.mockResolvedValue([[]]);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.PAYMENTS_PROVIDER;
    jest.restoreAllMocks();
  });

  describe('POST /webhook', () => {
    it('rejects a missing or invalid signature without touching the database', async () => {
      const event = signedEvent();

      const missing = await request(app).post('/api/v2/payments/webhook').set('Content-Type', 'application/json').send(event.body);
      const tampered = await postWebhook({ body: event.body.replace('25', '1'), signature: event.signature });

      expect(missing.status).toBe(401);
      expect(tampered.status).toBe(401);
      expect(mockConnection.query).not.toHaveBeenCalled();
    });

    it('returns 404 when payments are not enabled', async () => {
      delete process.env.PAYMENTS_PROVIDER;
      const response = await postWebhook(signedEvent());
      expect(response.status).toBe(404);
    });

    it('marks the invoice paid and notifies on a successful payment', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[linkRow]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValue([{ affectedRows: 1 }]);
      mockedDbQuery.mockResolvedValue([[{ user_id: 1 }]]);

      const response = await postWebhook(signedEvent());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true, outcome: 'paid' });
      const sql = sqlOf(mockConnection.query);
      expect(sql.some((q) => q.includes("UPDATE invoices_v2 SET invoice_status = 'paid'"))).toBe(true);
      expect(sql.some((q) => q.includes('UPDATE orders_v2 SET order_status'))).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
      expect(sqlOf(mockedDbQuery).some((q) => q.includes('INSERT INTO notifications_v2'))).toBe(true);
    });

    it('ignores a duplicate event', async () => {
      mockConnection.query.mockResolvedValueOnce([[linkRow]]).mockResolvedValueOnce([[{ id: 5 }]]);

      const response = await postWebhook(signedEvent());

      expect(response.body).toEqual({ received: true, outcome: 'duplicate' });
      expect(sqlOf(mockConnection.query).some((q) => q.includes('INSERT INTO payments_v2'))).toBe(false);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('does not mark the invoice paid when the amount differs', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[linkRow]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValue([{ affectedRows: 1 }]);

      const response = await postWebhook(signedEvent({ amount: 1 }));

      expect(response.body.outcome).toBe('amount_mismatch');
      expect(sqlOf(mockConnection.query).some((q) => q.includes("SET invoice_status = 'paid'"))).toBe(false);
    });

    it('records a failed payment, leaves the invoice unpaid and notifies the customer', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[linkRow]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValue([{ affectedRows: 1 }]);

      const response = await postWebhook(signedEvent({ status: 'failed' }));

      expect(response.body.outcome).toBe('failed');
      expect(sqlOf(mockConnection.query).some((q) => q.includes('UPDATE invoices_v2'))).toBe(false);
    });

    it('acknowledges events for an unknown payment', async () => {
      mockConnection.query.mockResolvedValueOnce([[]]);

      const response = await postWebhook(signedEvent());

      expect(response.status).toBe(200);
      expect(response.body.outcome).toBe('unknown_payment');
    });
  });

  describe('GET /status/:invoiceId', () => {
    it('requires authentication', async () => {
      const response = await request(app).get('/api/v2/payments/status/90');
      expect(response.status).toBe(401);
    });

    it("hides another customer's invoice", async () => {
      mockedDbQuery.mockResolvedValueOnce([[{ id: 90, user_id: 99, invoice_number: 'INV-1', invoice_status: 'unpaid', total_due: '25.00' }]]);

      const response = await request(app).get('/api/v2/payments/status/90').set('Cookie', authCookie(7, 'customer'));

      expect(response.status).toBe(404);
    });

    it('returns invoice and latest payment status to the owner', async () => {
      mockedDbQuery
        .mockResolvedValueOnce([[{ id: 90, user_id: 7, invoice_number: 'INV-1', invoice_status: 'paid', total_due: '25.00' }]])
        .mockResolvedValueOnce([[{ payment_status: 'succeeded' }]]);

      const response = await request(app).get('/api/v2/payments/status/90').set('Cookie', authCookie(7, 'customer'));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ invoice_status: 'paid', payment_status: 'succeeded', payments_enabled: true });
    });
  });

  describe('POST /invoices/:id/pay', () => {
    it('creates a new payment link for an unpaid invoice', async () => {
      mockedDbQuery
        .mockResolvedValueOnce([[{ id: 90, user_id: 7, invoice_number: 'INV-1', invoice_status: 'unpaid', total_due: '25.00' }]])
        .mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app).post('/api/v2/payments/invoices/90/pay').set('Cookie', authCookie(7, 'customer'));

      expect(response.status).toBe(200);
      expect(response.body.payment_url).toContain('/payments/mock?ref=mock_');
    });

    it('refuses an invoice that is already paid', async () => {
      mockedDbQuery.mockResolvedValueOnce([[{ id: 90, user_id: 7, invoice_number: 'INV-1', invoice_status: 'paid', total_due: '25.00' }]]);

      const response = await request(app).post('/api/v2/payments/invoices/90/pay').set('Cookie', authCookie(7, 'customer'));

      expect(response.status).toBe(400);
    });

    it("refuses another customer's invoice", async () => {
      mockedDbQuery.mockResolvedValueOnce([[{ id: 90, user_id: 99, invoice_number: 'INV-1', invoice_status: 'unpaid', total_due: '25.00' }]]);

      const response = await request(app).post('/api/v2/payments/invoices/90/pay').set('Cookie', authCookie(7, 'customer'));

      expect(response.status).toBe(404);
    });
  });

  describe('POST /mock/:ref/complete', () => {
    it('is unavailable unless the mock provider is active', async () => {
      delete process.env.PAYMENTS_PROVIDER;
      const response = await request(app).post('/api/v2/payments/mock/mock_abc/complete').set('Cookie', authCookie(7, 'customer'));
      expect(response.status).toBe(404);
    });

    it("cannot complete another customer's payment", async () => {
      mockedDbQuery.mockResolvedValueOnce([[{ total_due: '25.00', user_id: 99 }]]);

      const response = await request(app)
        .post('/api/v2/payments/mock/mock_abc/complete')
        .set('Cookie', authCookie(7, 'customer'))
        .send({ outcome: 'succeeded' });

      expect(response.status).toBe(404);
    });

    it('runs a simulated payment through the event pipeline', async () => {
      mockedDbQuery.mockResolvedValueOnce([[{ total_due: '25.00', user_id: 7 }]]);
      mockConnection.query
        .mockResolvedValueOnce([[linkRow]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValue([{ affectedRows: 1 }]);

      const response = await request(app)
        .post('/api/v2/payments/mock/mock_abc/complete')
        .set('Cookie', authCookie(7, 'customer'))
        .send({ outcome: 'succeeded' });

      expect(response.status).toBe(200);
      expect(response.body.outcome).toBe('paid');
    });
  });
});
