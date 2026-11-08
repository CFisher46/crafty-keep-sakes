import request from 'supertest';
import app from '../app';
import { db } from '../ts-common/database';

jest.mock('../ts-common/database', () => ({
  db: {
    query: jest.fn(),
    getConnection: jest.fn(),
  },
}));

const mockDbQuery = db.query as jest.Mock;

describe('GET /health', () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 without auth when the database responds', async () => {
    mockDbQuery.mockResolvedValue([[{ 1: 1 }]]);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(mockDbQuery).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns 503 without leaking details when the database fails', async () => {
    mockDbQuery.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:3306'));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable' });
    expect(JSON.stringify(response.body)).not.toContain('10.0.0.5');
    expect(console.error).toHaveBeenCalledWith('HEALTH_DB_UNAVAILABLE');
  });

  it('returns 503 and logs a timeout code when the database does not respond', async () => {
    mockDbQuery.mockImplementation(() => new Promise(() => {}));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(console.error).toHaveBeenCalledWith('HEALTH_DB_TIMEOUT');
  });
});
