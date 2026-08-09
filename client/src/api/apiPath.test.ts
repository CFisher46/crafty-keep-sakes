import { buildApiUrl, getApiBasePath } from './apiPath';
import { getDomainFlag, resolveDomainFlags } from './domainFlags';

describe('api route switchboard', () => {
  afterEach(() => {
    delete process.env.REACT_APP_API_URL;
    delete process.env.REACT_APP_API_AUTH_VERSION;
    delete process.env.REACT_APP_API_PRODUCTS_VERSION;
    delete process.env.REACT_APP_API_USERS_VERSION;
    delete process.env.REACT_APP_API_AUDIT_VERSION;
  });

  it('defaults canonical domains with users on the v2 route', () => {
    process.env.REACT_APP_API_URL = 'https://example.test';

    expect(getDomainFlag('auth')).toBe('legacy');
    expect(getApiBasePath('auth')).toBe('/api/auth');
    expect(buildApiUrl('auth', '/me')).toBe('https://example.test/api/auth/me');

    expect(getDomainFlag('users')).toBe('v2');
    expect(buildApiUrl('users', '/1')).toBe('https://example.test/api/v2/users/1');
  });

  it('routes a configured domain to the v2 path without code changes', () => {
    process.env.REACT_APP_API_URL = 'https://example.test';
    process.env.REACT_APP_API_AUTH_VERSION = 'v2';

    expect(resolveDomainFlags().auth).toBe('v2');
    expect(getDomainFlag('auth')).toBe('v2');
    expect(buildApiUrl('auth', '/me')).toBe('https://example.test/api/v2/auth/me');
  });
});
