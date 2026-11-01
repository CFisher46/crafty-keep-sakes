const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const file = path.resolve(
    __dirname,
    process.argv[2] || 'migrations/phase1_schema_v2.sql'
  );
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    multipleStatements: true,
  });

  try {
    await connection.query(fs.readFileSync(file, 'utf8'));
    const [tables] = await connection.query('SHOW TABLES');
    const [roles] = await connection.query('SELECT code FROM roles_v2');
    console.log(`Applied ${path.basename(file)}: ${tables.length} tables`);
    console.log(`Roles: ${roles.map((r) => r.code).join(', ')}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
