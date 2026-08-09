const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SAMPLE_PRODUCTS = [
  {
    sku: 'V2_SAMPLE_001',
    product_name: 'Craft Desk Lamp',
    description: 'A warm desk lamp for craft work.',
    price: 29.99,
    quantity: 10,
    is_live: 1,
    on_sale: 0,
    sale_percent: 0,
    category: 'Computers',
    images: ['/images/sample-lamp.jpg'],
  },
  {
    sku: 'V2_SAMPLE_002',
    product_name: 'Mechanical Keyboard',
    description: 'Compact keyboard for productive sessions.',
    price: 79.5,
    quantity: 7,
    is_live: 1,
    on_sale: 1,
    sale_percent: 10,
    category: 'Computers',
    images: ['/images/sample-keyboard.jpg'],
  },
  {
    sku: 'V2_SAMPLE_003',
    product_name: 'Ceramic Mug Set',
    description: 'Two handmade ceramic mugs.',
    price: 18.0,
    quantity: 14,
    is_live: 1,
    on_sale: 0,
    sale_percent: 0,
    category: 'Home',
    images: ['/images/sample-mugs.jpg'],
  },
];

function normalizeCategory(value) {
  const category = String(value || '').trim();
  return category || 'Uncategorized';
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uncategorized';
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toFlag(value, fallback = 0) {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'y'].includes(normalized)) return 1;
    if (['false', 'no', 'n'].includes(normalized)) return 0;
  }
  return fallback;
}

async function loadLegacyProducts(connection) {
  const [products] = await connection.query(
    `SELECT id, category, description, price, quantity, on_sale, product_name, is_live, sale_percent FROM products`
  );

  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const [images] = await connection.query(
    `SELECT product_id, image_path FROM product_images`
  );

  const imagesByProductId = new Map();
  if (Array.isArray(images)) {
    for (const row of images) {
      const productId = String(row.product_id || '').trim();
      if (!productId) continue;
      const list = imagesByProductId.get(productId) || [];
      if (row.image_path) {
        list.push(String(row.image_path));
      }
      imagesByProductId.set(productId, list);
    }
  }

  return products.map((row) => {
    const sku = String(row.id || '').trim();
    return {
      sku,
      product_name: String(row.product_name || sku || 'Unnamed Product'),
      description: String(row.description || ''),
      price: toNumber(row.price, 0),
      quantity: toInt(row.quantity, 0),
      is_live: toFlag(row.is_live, 1),
      on_sale: toFlag(row.on_sale, 0),
      sale_percent: toNumber(row.sale_percent, 0),
      category: normalizeCategory(row.category),
      images: imagesByProductId.get(sku) || [],
    };
  });
}

async function ensureCategory(connection, categoryName) {
  const slug = slugify(categoryName);

  await connection.query(
    `INSERT INTO categories_v2 (name, slug, is_active)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = VALUES(is_active)`,
    [categoryName, slug]
  );

  const [rows] = await connection.query(
    `SELECT id FROM categories_v2 WHERE slug = ? LIMIT 1`,
    [slug]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Failed to resolve category id for slug: ${slug}`);
  }

  return rows[0].id;
}

async function upsertProduct(connection, product) {
  await connection.query(
    `INSERT INTO products_v2
      (sku, product_name, description, price, quantity, is_live, on_sale, sale_percent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      product_name = VALUES(product_name),
      description = VALUES(description),
      price = VALUES(price),
      quantity = VALUES(quantity),
      is_live = VALUES(is_live),
      on_sale = VALUES(on_sale),
      sale_percent = VALUES(sale_percent)`,
    [
      product.sku,
      product.product_name,
      product.description,
      product.price,
      product.quantity,
      product.is_live,
      product.on_sale,
      product.sale_percent,
    ]
  );

  const [rows] = await connection.query(
    `SELECT id FROM products_v2 WHERE sku = ? LIMIT 1`,
    [product.sku]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Failed to resolve product id for sku: ${product.sku}`);
  }

  return rows[0].id;
}

async function ensureProductCategoryLink(connection, productId, categoryId) {
  await connection.query(
    `INSERT IGNORE INTO product_categories_v2 (product_id, category_id)
     VALUES (?, ?)`,
    [productId, categoryId]
  );
}

async function ensureProductImages(connection, productId, imagePaths) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    return;
  }

  for (let index = 0; index < imagePaths.length; index += 1) {
    const imagePath = String(imagePaths[index] || '').trim();
    if (!imagePath) continue;

    const sortOrder = index;
    const isPrimary = index === 0 ? 1 : 0;

    await connection.query(
      `INSERT INTO product_images_v2 (product_id, image_path, sort_order, is_primary)
       SELECT ?, ?, ?, ?
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM product_images_v2
         WHERE product_id = ? AND image_path = ?
       )`,
      [productId, imagePath, sortOrder, isPrimary, productId, imagePath]
    );
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await connection.beginTransaction();

    let sourceProducts = await loadLegacyProducts(connection);
    let source = 'legacy';

    if (sourceProducts.length === 0) {
      sourceProducts = SAMPLE_PRODUCTS;
      source = 'sample';
    }

    let upserted = 0;
    for (const product of sourceProducts) {
      const categoryName = normalizeCategory(product.category);
      const categoryId = await ensureCategory(connection, categoryName);
      const productId = await upsertProduct(connection, product);
      await ensureProductCategoryLink(connection, productId, categoryId);
      await ensureProductImages(connection, productId, product.images);
      upserted += 1;
    }

    await connection.commit();

    const [countRows] = await connection.query(
      `SELECT COUNT(*) AS count FROM products_v2 WHERE is_live = 1`
    );
    const liveCount = Array.isArray(countRows) ? countRows[0].count : 0;

    console.log(`Seed complete. Source: ${source}. Products processed: ${upserted}. Live v2 products: ${liveCount}.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Failed to seed products_v2:', error.message);
  process.exit(1);
});
