import express from 'express';
import request from 'supertest';
import getAuditLogsRouter from './get/handler';
import createAuditLogRouter from './post/handler';
import { db } from '../../ts-common/database';

jest.mock('../../ts-common/database', () => ({
  db: {
    query: jest.fn()
  }
}));

const mockedDatabase = db as unknown as { query: jest.Mock };

function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use('/api/audit', getAuditLogsRouter);
  app.use('/api/audit', createAuditLogRouter);

  return app;
}

describe('audit handlers', () => {
  beforeEach(() => {
    mockedDatabase.query.mockReset();
  });

  it('returns parsed audit logs from GET /api/audit', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([
      [
        {
          result: JSON.stringify({
            total_count: 1,
            data: JSON.stringify([{ log_ref: 1, action_type: 'CREATE' }])
          })
        }
      ]
    ]);

    const response = await request(app).get('/api/audit/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      total_count: 1,
      data: [{ log_ref: 1, action_type: 'CREATE' }]
    });
  });

  it('returns 500 when GET /api/audit fails', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockRejectedValue(new Error('db down'));

    const response = await request(app).get('/api/audit/');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch audit logs' });
  });

  it('creates an audit log entry', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockResolvedValue([{ insertId: 99 }]);

    const response = await request(app)
      .post('/api/audit/')
      .send({
        user: 'user-1',
        field_changed: 'email_address',
        action_type: 'UPDATE',
        api_source: 'users',
        changed_by: 'admin'
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      log_ref: 99,
      user: 'user-1',
      field_changed: 'email_address',
      action_type: 'UPDATE',
      api_source: 'users',
      changed_by: 'admin',
      log_dttm: expect.any(String)
    });
  });

  it('returns 500 when audit log creation fails', async () => {
    const app = createTestApp();

    mockedDatabase.query.mockRejectedValue(new Error('db down'));

    const response = await request(app)
      .post('/api/audit/')
      .send({
        user: 'user-1',
        field_changed: 'email_address',
        action_type: 'UPDATE',
        api_source: 'users'
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to create audit log' });
  });
});