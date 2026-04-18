import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;

function parseHexKey(keyName: string, rawValue?: string): Buffer {
  if (!rawValue) {
    throw new Error(`${keyName} environment variable is not set.`);
  }

  const normalizedValue = rawValue.trim();

  if (!HEX_64_REGEX.test(normalizedValue)) {
    throw new Error(
      `${keyName} must be a 64-character hex string (32 bytes for AES-256-CBC).`
    );
  }

  return Buffer.from(normalizedValue, 'hex');
}

const key = parseHexKey('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY);
const previousEncryptionKey = process.env.ENCRYPTION_KEY_PREVIOUS;
const fallbackKey = previousEncryptionKey
  ? parseHexKey('ENCRYPTION_KEY_PREVIOUS', previousEncryptionKey)
  : undefined;

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

  if (!/^[0-9a-fA-F]+$/.test(ivHex) || !/^[0-9a-fA-F]+$/.test(encrypted)) {
    return encryptedText;
  }

  const iv = Buffer.from(ivHex, 'hex');

  // Validate IV length
  if (iv.length !== 16) {
    console.warn(`Invalid IV length for: ${encryptedText}`);
    return encryptedText;
  }

  const keysToTry = fallbackKey ? [key, fallbackKey] : [key];

  for (const candidateKey of keysToTry) {
    try {
      const decipher = crypto.createDecipheriv(algorithm, candidateKey, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // Try next key
    }
  }

  console.warn('Unable to decrypt value with configured encryption keys.');
  return '';
}
