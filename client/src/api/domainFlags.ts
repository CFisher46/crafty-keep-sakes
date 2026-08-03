import { ApiDomain } from './apiPath';

export type DomainFlagMap = Record<ApiDomain, 'legacy' | 'v2'>;

const DEFAULT_DOMAIN_FLAGS: DomainFlagMap = {
  auth: 'legacy',
  products: 'legacy',
  users: 'legacy',
  audit: 'legacy',
};

function readFlag(value: string | undefined): 'legacy' | 'v2' {
  return String(value || '').trim().toLowerCase() === 'v2' ? 'v2' : 'legacy';
}

export function resolveDomainFlags(): DomainFlagMap {
  return {
    auth: readFlag(process.env.REACT_APP_API_AUTH_VERSION),
    products: readFlag(process.env.REACT_APP_API_PRODUCTS_VERSION),
    users: readFlag(process.env.REACT_APP_API_USERS_VERSION),
    audit: readFlag(process.env.REACT_APP_API_AUDIT_VERSION),
  };
}

export function getDomainFlag(domain: ApiDomain): 'legacy' | 'v2' {
  return resolveDomainFlags()[domain] || DEFAULT_DOMAIN_FLAGS[domain];
}
