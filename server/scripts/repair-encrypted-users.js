const crypto = require('crypto');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;
const ENCRYPTED_VALUE_REGEX = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;
const algorithm = 'aes-256-cbc';
const encryptedColumns = [
  'first_name',
  'last_name',
  'address_line1',
  'address_line2',
  'address_line3',
  'telephone_number'
];

function parseKey(name, value) {
  const normalized = (value || '').trim();
  if (!normalized) {
    throw new Error(`${name} is required.`);
  }
  if (!HEX_64_REGEX.test(normalized)) {
    throw new Error(`${name} must be a 64-character hex string.`);
  }
  return Buffer.from(normalized, 'hex');
}

function tryDecrypt(encryptedValue, key) {
  if (!ENCRYPTED_VALUE_REGEX.test(encryptedValue)) {
    return null;
  }

  const [ivHex, encryptedHex] = encryptedValue.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  if (iv.length !== 16) {
    return null;
  }

  try {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

async function main() {
  const shouldApply = process.argv.includes('--apply');
  const primaryKey = parseKey('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY);
  const previousKey = process.env.ENCRYPTION_KEY_PREVIOUS
    ? parseKey('ENCRYPTION_KEY_PREVIOUS', process.env.ENCRYPTION_KEY_PREVIOUS)
    : null;
  const keys = previousKey ? [primaryKey, previousKey] : [primaryKey];

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  try {
    const [rows] = await pool.query(
      `SELECT id, ${encryptedColumns.join(', ')} FROM users`
    );

    const updatesToApply = [];

    for (const row of rows) {
      const updates = {};

      for (const column of encryptedColumns) {
        const value = row[column];
        if (typeof value !== 'string' || value.length === 0) {
          continue;
        }

        if (!ENCRYPTED_VALUE_REGEX.test(value)) {
          continue;
        }

        const isDecryptable = keys.some((key) => tryDecrypt(value, key) !== null);
        if (!isDecryptable) {
          updates[column] = '';
        }
      }

      if (Object.keys(updates).length > 0) {
        updatesToApply.push({ id: row.id, updates });
      }
    }

    const totalUsers = rows.length;
    const affectedUsers = updatesToApply.length;
    const affectedFields = updatesToApply.reduce(
      (sum, item) => sum + Object.keys(item.updates).length,
      0
    );

    if (!shouldApply) {
      console.log('Dry run complete.');
      console.log(`Users scanned: ${totalUsers}`);
      console.log(`Users with undecryptable fields: ${affectedUsers}`);
      console.log(`Fields that would be cleared: ${affectedFields}`);
      console.log('Run with --apply to persist changes.');
      return;
    }

    for (const item of updatesToApply) {
      const columns = Object.keys(item.updates);
      const setClause = columns.map((column) => `${column} = ?`).join(', ');
      const values = columns.map((column) => item.updates[column]);
      values.push(item.id);

      await pool.query(`UPDATE users SET ${setClause} WHERE id = ?`, values);
    }

    console.log('Apply complete.');
    console.log(`Users scanned: ${totalUsers}`);
    console.log(`Users updated: ${affectedUsers}`);
    console.log(`Fields cleared: ${affectedFields}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Repair script failed:', error);
  process.exit(1);
});
