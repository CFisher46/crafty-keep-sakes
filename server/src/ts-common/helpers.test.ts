import { encrypt, decrypt } from './helpers';

describe('encryption helpers', () => {
  describe('encrypt and decrypt', () => {
    it('encrypts and decrypts a simple string', () => {
      const original = 'John Doe';
      const encrypted = encrypt(original);

      expect(encrypted).not.toBe(original);
      expect(encrypted).toContain(':');

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('generates different ciphertext for the same plaintext (due to random IV)', () => {
      const text = 'secret data';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(text);
      expect(decrypt(encrypted2)).toBe(text);
    });

    it('encrypts and decrypts emails', () => {
      const email = 'user@example.com';
      const encrypted = encrypt(email);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(email);
    });

    it('encrypts and decrypts addresses with special characters', () => {
      const address = "123 O'Brien Street, London, UK";
      const encrypted = encrypt(address);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(address);
    });

    it('handles empty strings gracefully', () => {
      const empty = '';
      const encrypted = encrypt(empty);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(empty);
    });

    it('returns non-encrypted values unchanged when decrypting', () => {
      const plaintext = 'PlainText';
      const result = decrypt(plaintext);

      expect(result).toBe(plaintext);
    });

    it('handles malformed encrypted data gracefully', () => {
      const malformed = 'not:valid:format:data';
      const result = decrypt(malformed);

      expect(typeof result).toBe('string');
    });

    it('returns original text for undersized IV', () => {
      const invalidIV = 'abc:deadbeef';
      const result = decrypt(invalidIV);

      expect(result).toBe(invalidIV);
    });

    it('handles non-hex characters in encrypted data gracefully', () => {
      const notHex = 'gg:zz';
      const result = decrypt(notHex);

      expect(result).toBe(notHex);
    });

    it('encrypts and decrypts unicode characters', () => {
      const unicode = '你好世界 🌍 مرحبا';
      const encrypted = encrypt(unicode);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(unicode);
    });
  });
});
