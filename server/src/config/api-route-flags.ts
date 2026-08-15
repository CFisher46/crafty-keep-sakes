export type ApiRouteDomain = 'auth' | 'products' | 'users' | 'audit' | 'basket';
export type ApiRouteSource = 'legacy' | 'v2';

export type ApiRouteFlags = Record<ApiRouteDomain, ApiRouteSource>;

const DEFAULT_FLAGS: ApiRouteFlags = {
  auth: 'legacy',
  products: 'v2',
  users: 'v2',
  audit: 'legacy',
  basket: 'v2',
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
    auth: parseSource(process.env.AUTH_API_SOURCE, DEFAULT_FLAGS.auth),
    products: parseSource(process.env.PRODUCTS_API_SOURCE, DEFAULT_FLAGS.products),
    users: parseSource(process.env.USERS_API_SOURCE, DEFAULT_FLAGS.users),
    audit: parseSource(process.env.AUDIT_API_SOURCE, DEFAULT_FLAGS.audit),
    basket: parseSource(process.env.BASKET_API_SOURCE, DEFAULT_FLAGS.basket),
  };
}

export function getApiRouteSource(domain: ApiRouteDomain): ApiRouteSource {
  const flags = resolveApiRouteFlags();
  return flags[domain] || DEFAULT_FLAGS[domain];
}
