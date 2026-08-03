const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const algorithm = 'aes-256-cbc';
const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = value;
    index += 1;
  }

  return args;
}

function parseHexKey(name, rawValue) {
  const normalized = (rawValue || '').trim();
  if (!normalized) {
    throw new Error(`${name} is required.`);
  }

  if (!HEX_64_REGEX.test(normalized)) {
    throw new Error(`${name} must be a 64-character hex string.`);
  }

  return Buffer.from(normalized, 'hex');
}

function encrypt(plainText, key) {
  const value = plainText ?? '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function sqlEscape(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function normalizeTarget(rawTarget) {
  const normalized = String(rawTarget || 'v2').trim().toLowerCase();
  if (!['v2', 'legacy'].includes(normalized)) {
    throw new Error("target must be one of: v2, legacy");
  }
  return normalized;
}

function getSharedFields(args) {
  return {
    firstName: args.firstName || 'Admin',
    lastName: args.lastName || 'User',
    telephone: args.telephone || '',
    address1: args.address1 || '',
    address2: args.address2 || '',
    address3: args.address3 || '',
    town: args.town || '',
    county: args.county || '',
    postcode: args.postcode || '',
  };
}

function buildV2Sql(args, passwordHash) {
  const role = (args.role || args.type || 'admin').toLowerCase();
  const status = (args.status || 'active').toLowerCase();

  if (!['admin', 'customer'].includes(role)) {
    throw new Error('role/type must be one of: admin, customer');
  }

  if (!['active', 'inactive', 'locked'].includes(status)) {
    throw new Error('status must be one of: active, inactive, locked');
  }

  const details = getSharedFields(args);

  return `START TRANSACTION;\n\nINSERT INTO users_v2 (email, password_hash, status)\nVALUES ('${sqlEscape(args.email)}', '${sqlEscape(passwordHash)}', '${sqlEscape(status)}');\n\nSET @new_user_id = LAST_INSERT_ID();\n\nINSERT INTO user_roles_v2 (user_id, role_id)\nSELECT @new_user_id, id FROM roles_v2 WHERE code = '${sqlEscape(role)}';\n\nINSERT INTO customer_profiles_v2 (user_id, first_name, last_name, telephone, address_line1, address_line2, address_line3, town, county, postcode)\nVALUES (@new_user_id, '${sqlEscape(details.firstName)}', '${sqlEscape(details.lastName)}', '${sqlEscape(details.telephone)}', '${sqlEscape(details.address1)}', '${sqlEscape(details.address2)}', '${sqlEscape(details.address3)}', '${sqlEscape(details.town)}', '${sqlEscape(details.county)}', '${sqlEscape(details.postcode)}');\n\nCOMMIT;`;
}

function buildLegacySql(args, passwordHash) {
  const key = parseHexKey('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY);
  const type = args.type || args.role || 'admin';
  const status = args.status || 'active';

  const details = getSharedFields(args);

  const encryptedFirstName = encrypt(details.firstName || 'Admin', key);
  const encryptedLastName = encrypt(details.lastName || 'User', key);
  const encryptedAddressLine1 = encrypt(
    details.address1 || 'Manual Insert Address 1',
    key
  );
  const encryptedAddressLine2 = encrypt(details.address2 || '', key);
  const encryptedAddressLine3 = encrypt(details.address3 || '', key);
  const encryptedTelephone = encrypt(details.telephone || '00000000000', key);

  const town = details.town || 'Not Set';
  const county = details.county || 'Not Set';
  const postcode = details.postcode || 'NA0 0AA';

  return `INSERT INTO users (email_address, first_name, last_name, address_line1, address_line2, address_line3, town, county, postcode, telephone_number, type, status, invoice_id, password) VALUES ('${sqlEscape(args.email)}', '${sqlEscape(encryptedFirstName)}', '${sqlEscape(encryptedLastName)}', '${sqlEscape(encryptedAddressLine1)}', '${sqlEscape(encryptedAddressLine2)}', '${sqlEscape(encryptedAddressLine3)}', '${sqlEscape(town)}', '${sqlEscape(county)}', '${sqlEscape(postcode)}', '${sqlEscape(encryptedTelephone)}', '${sqlEscape(type)}', '${sqlEscape(status)}', NULL, '${sqlEscape(passwordHash)}');`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = args.email;
  const password = args.password;
  const target = normalizeTarget(args.target);

  if (!email || !password) {
    throw new Error(
      'Usage: node scripts/generate-user-insert.js --email <email> --password <password> [--target v2|legacy] [--role admin|customer] [--type admin|customer] [--status active|inactive|locked] [--firstName <value>] [--lastName <value>] [--address1 <value>] [--address2 <value>] [--address3 <value>] [--town <value>] [--county <value>] [--postcode <value>] [--telephone <value>]'
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const sql =
    target === 'legacy'
      ? buildLegacySql(args, passwordHash)
      : buildV2Sql(args, passwordHash);

  console.log(sql);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
