export type AuthSource = 'legacy' | 'dual' | 'v2';

const DEFAULT_AUTH_SOURCE: AuthSource = 'dual';

export function resolveAuthSource(rawValue = process.env.AUTH_SOURCE): AuthSource {
  const normalized = String(rawValue || '').trim().toLowerCase();

  if (!normalized) {
    return DEFAULT_AUTH_SOURCE;
  }

  if (normalized === 'legacy' || normalized === 'dual' || normalized === 'v2') {
    return normalized;
  }

  return DEFAULT_AUTH_SOURCE;
}
