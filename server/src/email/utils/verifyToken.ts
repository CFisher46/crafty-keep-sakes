import crypto from 'crypto';

export const generateVerificationToken = () => {
  const token = crypto.randomBytes(32).toString('hex');

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const expiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  );

  return {
    token,
    tokenHash,
    expiresAt
  };
};