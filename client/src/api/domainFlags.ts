import { ApiDomain } from './apiPath';

export type DomainFlagMap = Record<ApiDomain, 'legacy' | 'v2'>;

const DEFAULT_DOMAIN_FLAGS: DomainFlagMap = {
  auth: 'v2',
  products: 'v2',
  users: 'v2',
  audit: 'v2',
  basket: 'v2',
  blog: 'v2',
};

function readFlag(
  value: string | undefined,
  defaultValue: 'legacy' | 'v2' = 'v2'
): 'legacy' | 'v2' {
  const normalized = String(value || '').trim().toLowerCase();

  if (!normalized) {
    return defaultValue;
  }

  return normalized === 'v2' ? 'v2' : 'legacy';
}

export function resolveDomainFlags(): DomainFlagMap {
  return {
    auth: readFlag(process.env.REACT_APP_API_AUTH_VERSION),
    products: readFlag(process.env.REACT_APP_API_PRODUCTS_VERSION),
    users: readFlag(process.env.REACT_APP_API_USERS_VERSION),
    audit: readFlag(process.env.REACT_APP_API_AUDIT_VERSION),
    basket: readFlag(process.env.REACT_APP_API_BASKET_VERSION),
    blog: readFlag(process.env.REACT_APP_API_BLOG_VERSION),
  };
}

export function getDomainFlag(domain: ApiDomain): 'legacy' | 'v2' {
  return resolveDomainFlags()[domain] || DEFAULT_DOMAIN_FLAGS[domain];
}
