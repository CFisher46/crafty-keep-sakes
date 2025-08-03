import crypto from "crypto";

const algorithm = "aes-256-cbc";
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  throw new Error("ENCRYPTION_KEY environment variable is not set.");
}
const key = Buffer.from(encryptionKey, "hex");
const iv = crypto.randomBytes(16);

export function encrypt(text: string) {
  let cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string) {
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
