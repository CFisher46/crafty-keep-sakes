const DEV_FALLBACK_SECRET = 'your-dev-secret';
const MIN_PRODUCTION_SECRET_LENGTH = 16;

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET must be set to at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production.`
      );
    }
    return secret;
  }

  return secret || DEV_FALLBACK_SECRET;
}

export const JWT_SECRET = resolveJwtSecret();
