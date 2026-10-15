const mockQuery = jest.fn();

jest.mock('../ts-common/database', () => ({
  db: { query: (...args: unknown[]) => mockQuery(...args) },
}));

import { channels, notify } from './service';

describe('notify', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('notifies every active admin when an order is placed', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ user_id: 1 }, { user_id: 2 }, { user_id: 1 }]])
      .mockResolvedValue([{ insertId: 1 }]);

    await notify('order_placed', {
      orderId: 40,
      invoiceId: 90,
      invoiceNumber: 'INV-1-40',
      totalDue: 30,
    });

    const inserts = mockQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('INSERT INTO notifications_v2')
    );
    expect(inserts).toHaveLength(2);
    expect(inserts.map(([, params]) => params[0])).toEqual([1, 2]);
    expect(inserts[0][1][1]).toBe('order_placed');
    expect(inserts[0][1][3]).toContain('£30.00');
  });

  it('notifies only the customer when an invoice status changes', async () => {
    mockQuery.mockResolvedValue([{ insertId: 1 }]);

    await notify('invoice_status_changed', {
      userId: 7,
      orderId: 40,
      invoiceId: 90,
      invoiceNumber: 'INV-1-40',
      status: 'paid',
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe(7);
    expect(params[1]).toBe('invoice_status_changed');
    expect(params[4]).toBe('/profile/7');
  });

  it('notifies the customer when tracking is added', async () => {
    mockQuery.mockResolvedValue([{ insertId: 1 }]);

    await notify('tracking_added', {
      userId: 7,
      orderId: 40,
      invoiceId: 90,
      invoiceNumber: 'INV-1-40',
      trackingInfo: 'RM123',
    });

    const [, params] = mockQuery.mock.calls[0];
    expect(params[1]).toBe('tracking_added');
    expect(params[3]).toContain('RM123');
  });

  it('does not throw when delivery fails', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));

    await expect(
      notify('tracking_added', {
        userId: 7,
        orderId: 40,
        invoiceId: 90,
        invoiceNumber: 'INV-1-40',
        trackingInfo: 'RM123',
      })
    ).resolves.toBeUndefined();
  });

  it('delivers through every configured channel', async () => {
    const extra = { name: 'test', deliver: jest.fn().mockResolvedValue(undefined) };
    channels.push(extra);
    mockQuery.mockResolvedValue([{ insertId: 1 }]);

    await notify('tracking_added', {
      userId: 7,
      orderId: 40,
      invoiceId: 90,
      invoiceNumber: 'INV-1-40',
      trackingInfo: 'RM123',
    });
    channels.pop();

    expect(extra.deliver).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 7, type: 'tracking_added' })
    );
  });
});
