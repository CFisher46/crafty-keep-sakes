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
  if (!existingUserColumns.has('token_version')) {
    await connection.query(
      'ALTER TABLE users_v2 ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0'
    );
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
    `SELECT kcu.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_NAME, rc.DELETE_RULE
     FROM information_schema.KEY_COLUMN_USAGE kcu
     LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
       AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
     WHERE kcu.TABLE_SCHEMA = DATABASE()
       AND kcu.TABLE_NAME = 'email_verification_tokens_v2'
       AND kcu.REFERENCED_TABLE_NAME IS NOT NULL`
  );
  if (
    !foreignKeys.some(
      (key) =>
        key.REFERENCED_TABLE_NAME === 'users_v2' && key.DELETE_RULE === 'CASCADE'
    )
  ) {
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

async function ensureAnonymousBlogActivitySchema(connection) {
  const tables = [
    'blog_post_comments_v2',
    'blog_post_views_v2',
    'blog_post_reactions_v2',
  ];

  for (const table of tables) {
    const [columns] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
    const userIdColumn = columns.find((column) => column.Field === 'user_id');
    if (!userIdColumn) {
      throw new Error(`Missing user_id column on ${table}`);
    }
    if (userIdColumn.Null !== 'YES') {
      await connection.query(
        `ALTER TABLE \`${table}\` MODIFY user_id BIGINT UNSIGNED NULL`
      );
    }

    const [foreignKeys] = await connection.query(
      `SELECT kcu.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_NAME, rc.DELETE_RULE
       FROM information_schema.KEY_COLUMN_USAGE kcu
       LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
         ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
         AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
       WHERE kcu.TABLE_SCHEMA = DATABASE()
         AND kcu.TABLE_NAME = ?
         AND kcu.REFERENCED_TABLE_NAME IS NOT NULL`,
      [table]
    );
    const userForeignKeys = foreignKeys.filter(
      (key) => key.REFERENCED_TABLE_NAME === 'users_v2'
    );
    if (
      userForeignKeys.length === 1 &&
      userForeignKeys[0].DELETE_RULE === 'SET NULL'
    ) {
      continue;
    }

    for (const key of userForeignKeys) {
      const constraint = String(key.CONSTRAINT_NAME).replace(/`/g, '``');
      await connection.query(
        `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${constraint}\``
      );
    }

    const constraint = `fk_${table}_user`;
    await connection.query(
      `ALTER TABLE \`${table}\`
       ADD CONSTRAINT \`${constraint}\`
       FOREIGN KEY (user_id) REFERENCES users_v2(id) ON DELETE SET NULL`
    );
  }
}

async function ensureProductDeliverySchema(connection) {
  const [productColumns] = await connection.query('SHOW COLUMNS FROM products_v2');
  if (!productColumns.some((column) => column.Field === 'delivery_tier')) {
    await connection.query(
      "ALTER TABLE products_v2 ADD COLUMN delivery_tier ENUM('small', 'medium', 'large', 'largest') NULL DEFAULT NULL"
    );
  }
}

async function ensureProductReviewSchema(connection) {
  const [columns] = await connection.query('SHOW COLUMNS FROM product_reviews_v2');
  const existingColumns = new Map(columns.map((column) => [column.Field, column]));
  const ratingColumns = [
    'match_description_rating',
    'quality_rating',
    'value_rating',
  ];
  const missingRatingColumns = ratingColumns.filter((column) => !existingColumns.has(column));

  for (const column of missingRatingColumns) {
    await connection.query(
      `ALTER TABLE product_reviews_v2 ADD COLUMN ${column} TINYINT UNSIGNED NOT NULL DEFAULT 5`
    );
  }

  const starCountColumn = existingColumns.get('star_count');
  if (!starCountColumn) {
    await connection.query(
      'ALTER TABLE product_reviews_v2 ADD COLUMN star_count DECIMAL(3,2) NOT NULL DEFAULT 5.00'
    );
  } else if (!String(starCountColumn.Type).toLowerCase().startsWith('decimal(3,2)')) {
    await connection.query(
      'ALTER TABLE product_reviews_v2 MODIFY star_count DECIMAL(3,2) NOT NULL DEFAULT 5.00'
    );
  }

  if (missingRatingColumns.length > 0 && existingColumns.has('star_count')) {
    // Preserve legacy ratings by using the existing overall score for each new criterion.
    const assignments = missingRatingColumns
      .map((column) => `${column} = LEAST(5, GREATEST(1, star_count))`)
      .join(', ');
    await connection.query(`UPDATE product_reviews_v2 SET ${assignments}`);
  }

  // Preserve old feedback; only narrow the column when existing rows fit.
  const commentColumn = existingColumns.get('comment');
  if (commentColumn && !String(commentColumn.Type).toLowerCase().startsWith('varchar(250)')) {
    const [[result]] = await connection.query(
      'SELECT EXISTS (SELECT 1 FROM product_reviews_v2 WHERE CHAR_LENGTH(comment) > 250) AS has_long_comment'
    );
    if (Number(result.has_long_comment) === 0) {
      await connection.query(
        'ALTER TABLE product_reviews_v2 MODIFY comment VARCHAR(250) NOT NULL'
      );
    }
  }
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
      await ensureAnonymousBlogActivitySchema(connection);
      await ensureProductDeliverySchema(connection);
      await ensureProductReviewSchema(connection);
    }
    const [tables] = await connection.query('SHOW TABLES');
    const [roles] = await connection.query('SELECT code FROM roles_v2');
    console.log(`Applied ${path.basename(file)}: ${tables.length} tables`);
    console.log(`Roles: ${roles.map((r) => r.code).join(', ')}`);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { ensureProductDeliverySchema, ensureProductReviewSchema };
