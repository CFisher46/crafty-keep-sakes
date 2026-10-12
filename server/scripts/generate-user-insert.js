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

  return `START TRANSACTION;\n\nINSERT INTO users_v2 (email, password_hash, status)\nVALUES ('${sqlEscape(args.email)}', '${sqlEscape(passwordHash)}', '${sqlEscape(status)}');\n\nSET @new_user_id = LAST_INSERT_ID();\n\nINSERT INTO user_roles_v2 (user_id, role_id)\nSELECT @new_user_id, id FROM roles_v2 WHERE code = '${sqlEscape(role)}';\n\nINSERT INTO customer_profiles_v2 (user_id, first_name, last_name, telephone, address_line1, address_line2, address_line3, town, county, postcode)\nVALUES (@new_user_id, '${sqlEscape(details.firstName)}', '${sqlEscape(details.lastName)}', '${sqlEscape(details.telephone)}', '${sqlEscape(details.address1)}', '${sqlEscape(details.address2)}', '${sqlEscape(details.address3)}', '${sqlEscape(details.town)}', '${sqlEscape(details.county)}', '${sqlEscape(details.postcode)}');\n\nCOMMIT;`;
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
