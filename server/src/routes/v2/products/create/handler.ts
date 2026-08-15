import express from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { Product } from '../../../products/types';
import { createProductV2Query } from './sql';
import {
  INSERT_PRODUCT_CATEGORY_LINK_QUERY,
  SELECT_CATEGORY_ID_BY_SLUG_QUERY,
  UPSERT_CATEGORY_QUERY,
} from '../shared/sql';
import {
  verifyAuthToken,
  requireRole,
} from '../../../../ts-common/middleware';

const router = express.Router();

const toNumber = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
};

const toInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
};

const toBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }

  throw new Error(`Invalid ${fieldName}`);
};

const normalizeProduct = (input: Partial<Product>): Product => ({
  id: String(input.id ?? '').trim(),
  category: String(input.category ?? '').trim(),
  description: String(input.description ?? '').trim(),
  price: toNumber(input.price, 'price'),
  quantity: toInteger(input.quantity, 'quantity'),
  on_sale: toBoolean(input.on_sale, 'on_sale'),
  product_name: String(input.product_name ?? '').trim(),
  is_live: toBoolean(input.is_live, 'is_live'),
  sale_percent: toNumber(input.sale_percent ?? 0, 'sale_percent'),
  images: String(input.images ?? '').trim(),
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseCategories = (categoryValue: string): string[] => {
  const categories = categoryValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(categories));
  return unique.length ? unique : ['Uncategorized'];
};

router.post('/', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log('POST /api/v2/products');

  const connection = await db.getConnection();

  try {
    const product = normalizeProduct(req.body as Partial<Product>);
    const categories = parseCategories(product.category);
    const sku = product.id || `sku-${Date.now()}`;

    await connection.beginTransaction();

    const { sql, values } = createProductV2Query(product, sku);
    const [insertResult] = await connection.query<ResultSetHeader>(sql, values);

    const productId = insertResult.insertId;

    for (const categoryName of categories) {
      const slug = slugify(categoryName) || 'uncategorized';

      await connection.query(UPSERT_CATEGORY_QUERY, [categoryName, slug]);

      const [categoryRows] = await connection.query<RowDataPacket[]>(
        SELECT_CATEGORY_ID_BY_SLUG_QUERY,
        [slug]
      );

      const categoryId = categoryRows[0]?.id;

      if (!categoryId) {
        throw new Error('Failed to resolve category id');
      }

      await connection.query(INSERT_PRODUCT_CATEGORY_LINK_QUERY, [productId, categoryId]);
    }

    await connection.commit();

    res.status(201).json({
      message: 'Product created',
      insertId: insertResult.insertId,
    });
  } catch (err) {
    await connection.rollback();

    if (err instanceof Error && err.message.startsWith('Invalid ')) {
      res.status(400).json({ error: err.message });
      return;
    }

    console.error('Create V2 Product Error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

export default router;