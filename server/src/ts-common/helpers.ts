import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  throw new Error('ENCRYPTION_KEY environment variable is not set.');
}
const key = Buffer.from(encryptionKey, 'hex');

export function encrypt(text: string) {
  // Generate a unique IV for each encryption
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Store IV with the encrypted data
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string) {
  // Handle non-encrypted values (like "NewName")
  if (!encryptedText || !encryptedText.includes(':')) {
    return encryptedText;
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    console.warn(`Invalid encrypted format: ${encryptedText}`);
    return encryptedText;
  }

  const [ivHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');

  // Validate IV length
  if (iv.length !== 16) {
    console.warn(`Invalid IV length for: ${encryptedText}`);
    return encryptedText;
  }

  try {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error(`Decryption failed for: ${encryptedText}`, error);
    return encryptedText;
  }
}
