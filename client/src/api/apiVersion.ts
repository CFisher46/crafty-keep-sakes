export type ApiVersion = 'v1' | 'v2';

const DEFAULT_API_VERSION: ApiVersion = 'v2';

export function resolveApiVersion(rawValue = process.env.REACT_APP_API_VERSION): ApiVersion {
  const normalized = String(rawValue || '').trim().toLowerCase();

  if (normalized === 'v2') {
    return 'v2';
  }

  return DEFAULT_API_VERSION;
}
