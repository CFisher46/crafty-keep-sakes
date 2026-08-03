const bcrypt = require('bcryptjs');

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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = args.email;
  const password = args.password;

  if (!email || !password) {
    throw new Error(
      'Usage: node scripts/generate-user-v2-insert.js --email <email> --password <password> [--role admin|customer] [--status active|inactive|locked] [--firstName <value>] [--lastName <value>] [--telephone <value>] [--address1 <value>] [--address2 <value>] [--address3 <value>] [--town <value>] [--county <value>] [--postcode <value>]'
    );
  }

  const role = (args.role || 'admin').toLowerCase();
  const status = (args.status || 'active').toLowerCase();

  if (!['admin', 'customer'].includes(role)) {
    throw new Error('role must be one of: admin, customer');
  }

  if (!['active', 'inactive', 'locked'].includes(status)) {
    throw new Error('status must be one of: active, inactive, locked');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const firstName = args.firstName || 'Admin';
  const lastName = args.lastName || 'User';
  const telephone = args.telephone || '';
  const address1 = args.address1 || '';
  const address2 = args.address2 || '';
  const address3 = args.address3 || '';
  const town = args.town || '';
  const county = args.county || '';
  const postcode = args.postcode || '';

  const sql = `START TRANSACTION;\n\nINSERT INTO users_v2 (email, password_hash, status)\nVALUES ('${sqlEscape(email)}', '${sqlEscape(passwordHash)}', '${sqlEscape(status)}');\n\nSET @new_user_id = LAST_INSERT_ID();\n\nINSERT INTO user_roles_v2 (user_id, role_id)\nSELECT @new_user_id, id FROM roles_v2 WHERE code = '${sqlEscape(role)}';\n\nINSERT INTO customer_profiles_v2 (user_id, first_name, last_name, telephone, address_line1, address_line2, address_line3, town, county, postcode)\nVALUES (@new_user_id, '${sqlEscape(firstName)}', '${sqlEscape(lastName)}', '${sqlEscape(telephone)}', '${sqlEscape(address1)}', '${sqlEscape(address2)}', '${sqlEscape(address3)}', '${sqlEscape(town)}', '${sqlEscape(county)}', '${sqlEscape(postcode)}');\n\nCOMMIT;`;

  console.log(sql);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
