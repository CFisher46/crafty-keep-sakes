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
  return String(value).replace(/'/g, "''");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = args.email;
  const password = args.password;

  if (!email || !password) {
    throw new Error(
      'Usage: node scripts/generate-user-insert.js --email <email> --password <password> [--firstName <value>] [--lastName <value>] [--address1 <value>] [--address2 <value>] [--address3 <value>] [--town <value>] [--county <value>] [--postcode <value>] [--telephone <value>] [--type <value>] [--status <value>]'
    );
  }

  const key = parseHexKey('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY);
  const passwordHash = await bcrypt.hash(password, 10);

  const type = args.type || 'admin';
  const status = args.status || 'active';

  const firstName = encrypt(args.firstName || 'Admin', key);
  const lastName = encrypt(args.lastName || 'User', key);
  const addressLine1 = encrypt(args.address1 || 'Manual Insert Address 1', key);
  const addressLine2 = encrypt(args.address2 || '', key);
  const addressLine3 = encrypt(args.address3 || '', key);
  const telephone = encrypt(args.telephone || '00000000000', key);

  const town = args.town || 'Not Set';
  const county = args.county || 'Not Set';
  const postcode = args.postcode || 'NA0 0AA';

  const sql = `INSERT INTO users (email_address, first_name, last_name, address_line1, address_line2, address_line3, town, county, postcode, telephone_number, type, status, invoice_id, password) VALUES ('${sqlEscape(email)}', '${sqlEscape(firstName)}', '${sqlEscape(lastName)}', '${sqlEscape(addressLine1)}', '${sqlEscape(addressLine2)}', '${sqlEscape(addressLine3)}', '${sqlEscape(town)}', '${sqlEscape(county)}', '${sqlEscape(postcode)}', '${sqlEscape(telephone)}', '${sqlEscape(type)}', '${sqlEscape(status)}', NULL, '${sqlEscape(passwordHash)}');`;

  console.log(sql);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
