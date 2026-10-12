const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });


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

function sqlEscape(value) {
  return String(value ?? '').replace(/'/g, "''");
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

  const email = sqlEscape(args.email);
  const q = (value) => `'${sqlEscape(value)}'`;

  // Three independent statements with no session variables, so they also
  // work in editors that run one statement at a time. Run them in order.
  return [
    `INSERT INTO users_v2 (email, password_hash, status)\nVALUES ('${email}', ${q(passwordHash)}, ${q(status)});`,
    `INSERT INTO user_roles_v2 (user_id, role_id)\nSELECT u.id, r.id FROM users_v2 u JOIN roles_v2 r ON r.code = ${q(role)}\nWHERE u.email = '${email}';`,
    `INSERT INTO customer_profiles_v2 (user_id, first_name, last_name, telephone, address_line1, address_line2, address_line3, town, county, postcode)\nSELECT id, ${q(details.firstName)}, ${q(details.lastName)}, ${q(details.telephone)}, ${q(details.address1)}, ${q(details.address2)}, ${q(details.address3)}, ${q(details.town)}, ${q(details.county)}, ${q(details.postcode)}\nFROM users_v2 WHERE email = '${email}';`,
  ].join('\n\n-- next statement\n\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = args.email;
  const password = args.password;

  if (!email || !password) {
    throw new Error(
      'Usage: node scripts/generate-user-insert.js --email <email> --password <password> [--role admin|customer] [--status active|inactive|locked] [--firstName <value>] [--lastName <value>] [--address1 <value>] [--address2 <value>] [--address3 <value>] [--town <value>] [--county <value>] [--postcode <value>] [--telephone <value>]'
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const sql = buildV2Sql(args, passwordHash);

  console.log(sql);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
