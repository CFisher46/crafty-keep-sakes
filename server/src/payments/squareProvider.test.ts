import { computeSquareSignature, createSquareProvider, readSquareConfig, SQUARE_SIGNATURE_HEADER, SquareConfig } from './squareProvider';

const config: SquareConfig = {
  accessToken: 'token',
  locationId: 'LOC1',
  webhookSignatureKey: 'sig-key',
  webhookUrl: 'https://api.example.com/api/v2/payments/webhook',
  environment: 'sandbox',
};

const eventBody = (overrides: Record<string, unknown> = {}, status = 'COMPLETED') =>
  Buffer.from(
    JSON.stringify({
      event_id: 'evt-1',
      type: 'payment.updated',
      data: {
        object: {
          payment: { id: 'pay-1', order_id: 'ORDER1', status, amount_money: { amount: 2550, currency: 'GBP' } },
        },
      },
      ...overrides,
    })
  );

const signed = (body: Buffer, url = config.webhookUrl, key = config.webhookSignatureKey) => ({
  [SQUARE_SIGNATURE_HEADER]: computeSquareSignature(key, url, body),
});

describe('square provider', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('parseWebhook', () => {
    const provider = createSquareProvider(config);

    it('maps a completed payment to a succeeded event with the amount in pounds', () => {
      const body = eventBody();
      expect(provider.parseWebhook(body, signed(body))).toEqual({
        eventId: 'evt-1',
        type: 'payment.updated',
        providerRef: 'ORDER1',
        status: 'succeeded',
        amount: 25.5,
        currency: 'GBP',
      });
    });

    it.each([
      ['FAILED', 'failed'],
      ['CANCELED', 'failed'],
      ['APPROVED', 'pending'],
      ['PENDING', 'pending'],
    ])('maps %s to %s', (squareStatus, expected) => {
      const body = eventBody({}, squareStatus);
      expect(provider.parseWebhook(body, signed(body))?.status).toBe(expected);
    });

    it('rejects a missing, wrong-key, wrong-url or tampered signature', () => {
      const body = eventBody();
      expect(provider.parseWebhook(body, {})).toBeNull();
      expect(provider.parseWebhook(body, signed(body, config.webhookUrl, 'other-key'))).toBeNull();
      expect(provider.parseWebhook(body, signed(body, 'https://evil.example/hook'))).toBeNull();
      expect(provider.parseWebhook(Buffer.from(body.toString().replace('2550', '1')), signed(body))).toBeNull();
    });

    it('rejects a correctly signed event that is not a payment', () => {
      const body = eventBody({ data: { object: {} } });
      expect(provider.parseWebhook(body, signed(body))).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"reason":"missing_event_id_or_payment_order_id"'));
    });

    it('logs signature and payload rejection reasons without logging sensitive values', () => {
      const body = eventBody();
      expect(provider.parseWebhook(body, {})).toBeNull();
      expect(provider.parseWebhook(body, signed(body, config.webhookUrl, 'other-key'))).toBeNull();
      const invalid = Buffer.from('not json');
      expect(provider.parseWebhook(invalid, signed(invalid))).toBeNull();
      const logs = (console.warn as jest.Mock).mock.calls.flat().join('\n');
      expect(logs).toContain('"reason":"missing_signature"');
      expect(logs).toContain('"reason":"signature_mismatch"');
      expect(logs).toContain('"reason":"invalid_json"');
      expect(logs).not.toContain(config.webhookSignatureKey);
      expect(logs).not.toContain(body.toString());
    });
  });

  describe('createPaymentLink', () => {
    const input = { invoiceId: 90, invoiceNumber: 'INV-1', amount: 25.5, currency: 'GBP', redirectUrl: 'https://shop.example/payments/result?invoice=90' };

    it('creates a payment link in pence and returns the order id as the reference', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ payment_link: { id: 'PL1', url: 'https://sandbox.square.link/u/abc', order_id: 'ORDER1' } }),
      });

      const link = await createSquareProvider(config, fetchMock as unknown as typeof fetch).createPaymentLink(input);

      expect(link).toEqual({ providerRef: 'ORDER1', url: 'https://sandbox.square.link/u/abc' });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://connect.squareupsandbox.com/v2/online-checkout/payment-links');
      expect(init.headers.Authorization).toBe('Bearer token');
      const sent = JSON.parse(init.body);
      expect(sent.quick_pay).toMatchObject({ price_money: { amount: 2550, currency: 'GBP' }, location_id: 'LOC1' });
      expect(sent.checkout_options.redirect_url).toBe(input.redirectUrl);
      expect(sent.idempotency_key).toEqual(expect.any(String));
    });

    it('uses the production host for the production environment', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ payment_link: { url: 'u', order_id: 'o' } }) });
      await createSquareProvider({ ...config, environment: 'production' }, fetchMock as unknown as typeof fetch).createPaymentLink(input);
      expect(String(fetchMock.mock.calls[0][0])).toContain('https://connect.squareup.com/');
    });

    it('throws a generic error and does not leak Square details when the request fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ errors: [{ code: 'UNAUTHORIZED' }] }) });

      await expect(createSquareProvider(config, fetchMock as unknown as typeof fetch).createPaymentLink(input)).rejects.toThrow('Square could not create the payment link');
    });
  });

  describe('readSquareConfig', () => {
    const sandbox = { SQUARE_SANDBOX_ACCESS_TOKEN: 'sb-token', SQUARE_SANDBOX_LOCATION_ID: 'sb-loc', SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY: 'sb-key', SQUARE_WEBHOOK_URL: 'https://x/hook' };
    const live = { SQUARE_PRODUCTION_ACCESS_TOKEN: 'live-token', SQUARE_PRODUCTION_LOCATION_ID: 'live-loc', SQUARE_PRODUCTION_WEBHOOK_SIGNATURE_KEY: 'live-key', SQUARE_WEBHOOK_URL: 'https://x/hook' };
    const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

    it('lists every missing setting for the active environment', () => {
      expect(() => readSquareConfig(env({}))).toThrow(
        'Square sandbox is not configured. Missing: SQUARE_SANDBOX_ACCESS_TOKEN, SQUARE_SANDBOX_LOCATION_ID, SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY, SQUARE_WEBHOOK_URL'
      );
    });

    it('uses the sandbox by default, including the legacy unprefixed names', () => {
      expect(readSquareConfig(env(sandbox))).toMatchObject({ environment: 'sandbox', accessToken: 'sb-token' });
      const legacy = { SQUARE_ACCESS_TOKEN: 'a', SQUARE_LOCATION_ID: 'b', SQUARE_WEBHOOK_SIGNATURE_KEY: 'c', SQUARE_WEBHOOK_URL: 'd' };
      expect(readSquareConfig(env(legacy))).toMatchObject({ environment: 'sandbox', accessToken: 'a' });
    });

    it('refuses production outside a production runtime, even with live credentials present', () => {
      expect(() => readSquareConfig(env({ ...live, ...sandbox, SQUARE_ENVIRONMENT: 'production' }))).toThrow('only available when NODE_ENV=production');
      expect(() => readSquareConfig(env({ ...live, SQUARE_ENVIRONMENT: 'production', NODE_ENV: 'development' }))).toThrow('only available when NODE_ENV=production');
    });

    it('stays on the sandbox in production until SQUARE_ENVIRONMENT=production', () => {
      expect(readSquareConfig(env({ ...sandbox, ...live, NODE_ENV: 'production' })).environment).toBe('sandbox');
    });

    it('goes live only with production runtime, the production flag and production credentials', () => {
      expect(readSquareConfig(env({ ...live, NODE_ENV: 'production', SQUARE_ENVIRONMENT: 'Production' }))).toMatchObject({
        environment: 'production',
        accessToken: 'live-token',
        locationId: 'live-loc',
        webhookSignatureKey: 'live-key',
      });
    });

    it('never falls back to sandbox or unprefixed credentials for production', () => {
      const legacy = { SQUARE_ACCESS_TOKEN: 'a', SQUARE_LOCATION_ID: 'b', SQUARE_WEBHOOK_SIGNATURE_KEY: 'c', SQUARE_WEBHOOK_URL: 'd' };
      expect(() => readSquareConfig(env({ ...sandbox, ...legacy, NODE_ENV: 'production', SQUARE_ENVIRONMENT: 'production' }))).toThrow(
        'Square production is not configured. Missing: SQUARE_PRODUCTION_ACCESS_TOKEN'
      );
    });
  });
});
