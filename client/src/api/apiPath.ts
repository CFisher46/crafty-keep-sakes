import { ApiVersion, resolveApiVersion } from './apiVersion';
import { getDomainFlag } from './domainFlags';

export type ApiDomain = 'auth' | 'products' | 'users' | 'audit' | 'basket';

const DOMAIN_PATHS: Record<ApiDomain, Record<ApiVersion, string>> = {
  auth: {
    v1: '/api/auth',
    v2: '/api/v2/auth',
  },
  products: {
    v1: '/api/products',
    v2: '/api/v2/products',
  },
  users: {
    v1: '/api/users',
    v2: '/api/v2/users',
  },
  audit: {
    v1: '/api/audit',
    v2: '/api/v2/audit',
  },
  basket: {
    v1: '/api/basket',
    v2: '/api/v2/basket',
  },
};

export function getApiBasePath(domain: ApiDomain, version = resolveApiVersion()): string {
  return DOMAIN_PATHS[domain][version];
}

export function buildApiUrl(domain: ApiDomain, path = '', version?: ApiVersion): string {
  const resolvedVersion = version ?? (getDomainFlag(domain) === 'v2' ? 'v2' : 'v1');
  const basePath = getApiBasePath(domain, resolvedVersion);
  if (!path) {
    return `${process.env.REACT_APP_API_URL || ''}${basePath}`;
  }

  if (path.startsWith('?')) {
    return `${process.env.REACT_APP_API_URL || ''}${basePath}${path}`;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${process.env.REACT_APP_API_URL || ''}${basePath}${normalizedPath}`;
}
