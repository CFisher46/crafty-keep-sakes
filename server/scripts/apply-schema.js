const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function ensureEmailVerificationSchema(connection) {
  const [userColumns] = await connection.query('SHOW COLUMNS FROM users_v2');
  const existingUserColumns = new Set(userColumns.map((column) => column.Field));

  if (!existingUserColumns.has('email_verified')) {
    await connection.query(
      'ALTER TABLE users_v2 ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0'
    );
  }
  if (!existingUserColumns.has('email_verified_at')) {
    await connection.query('ALTER TABLE users_v2 ADD COLUMN email_verified_at DATETIME NULL');
  }

  const [tokenColumns] = await connection.query(
    'SHOW COLUMNS FROM email_verification_tokens_v2'
  );
  if (!tokenColumns.some((column) => column.Field === 'sent_at')) {
    await connection.query(
      'ALTER TABLE email_verification_tokens_v2 ADD COLUMN sent_at DATETIME NULL'
    );
  }

  const [foreignKeys] = await connection.query(
    `SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'email_verification_tokens_v2'
       AND REFERENCED_TABLE_NAME IS NOT NULL`
  );
  if (!foreignKeys.some((key) => key.REFERENCED_TABLE_NAME === 'users_v2')) {
    await connection.query('DELETE FROM email_verification_tokens_v2');
    for (const key of foreignKeys) {
      const constraint = String(key.CONSTRAINT_NAME).replace(/`/g, '``');
      await connection.query(
        `ALTER TABLE email_verification_tokens_v2 DROP FOREIGN KEY \`${constraint}\``
      );
    }
    await connection.query(
      'ALTER TABLE email_verification_tokens_v2 MODIFY user_id BIGINT UNSIGNED NOT NULL'
    );
    await connection.query(
      `ALTER TABLE email_verification_tokens_v2
       ADD CONSTRAINT fk_email_verification_tokens_v2_user
       FOREIGN KEY (user_id) REFERENCES users_v2(id) ON DELETE CASCADE`
    );
  }

  await connection.query(
    `UPDATE users_v2 u
     INNER JOIN user_roles_v2 ur ON ur.user_id = u.id
     INNER JOIN roles_v2 r ON r.id = ur.role_id
     SET u.email_verified = 1,
         u.email_verified_at = COALESCE(u.email_verified_at, CURRENT_TIMESTAMP)
     WHERE r.code = 'admin'`
  );
}

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
    if (path.basename(file) === 'phase1_schema_v2.sql') {
      await ensureEmailVerificationSchema(connection);
    }
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
