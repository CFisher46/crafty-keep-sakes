export type ApiRouteDomain = 'auth' | 'products' | 'users' | 'audit';
export type ApiRouteSource = 'legacy' | 'v2';

export type ApiRouteFlags = Record<ApiRouteDomain, ApiRouteSource>;

const DEFAULT_FLAGS: ApiRouteFlags = {
  auth: 'legacy',
  products: 'legacy',
  users: 'v2',
  audit: 'legacy',
};

function parseSource(
  rawValue?: string,
  defaultValue: ApiRouteSource = 'legacy'
): ApiRouteSource {
  const normalized = String(rawValue || '').trim().toLowerCase();

  if (!normalized) {
    return defaultValue;
  }

  return normalized === 'v2' ? 'v2' : 'legacy';
}

export function resolveApiRouteFlags(): ApiRouteFlags {
  return {
    auth: parseSource(process.env.AUTH_API_SOURCE),
    products: parseSource(process.env.PRODUCTS_API_SOURCE),
    users: parseSource(process.env.USERS_API_SOURCE, 'v2'),
    audit: parseSource(process.env.AUDIT_API_SOURCE),
  };
}

export function getApiRouteSource(domain: ApiRouteDomain): ApiRouteSource {
  const flags = resolveApiRouteFlags();
  return flags[domain] || DEFAULT_FLAGS[domain];
}
