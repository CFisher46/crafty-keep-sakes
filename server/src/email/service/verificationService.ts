import crypto from 'crypto';
import type { PoolConnection } from 'mysql2/promise';

const TOKEN_EXPIRY_HOURS = 24;

export function verificationFrontendUrl(requestOrigin?: string): string {
  const defaultUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const allowedOrigins = (process.env.VERIFICATION_FRONTEND_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : defaultUrl;
}

export async function createVerificationToken(
  connection: PoolConnection,
  userId: number,
  requestOrigin?: string
): Promise<{ verificationUrl: string; tokenHash: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  const frontendUrl = verificationFrontendUrl(requestOrigin);
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

  await connection.query(
    'UPDATE email_verification_tokens_v2 SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL',
    [userId]
  );
  await connection.query(
    'INSERT INTO email_verification_tokens_v2 (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );

  return { verificationUrl, tokenHash };
}

export function hashVerificationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
