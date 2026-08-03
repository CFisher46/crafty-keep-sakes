import express from 'express';
import { db } from '../../../ts-common/database';
import { Product } from '../types';
import { createProductQuery } from './sql';
import { ResultSetHeader } from 'mysql2';
import { verifyAuthToken, requireRole } from '../../../ts-common/middleware';

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

router.post('/', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log('POST /api/products');

  try {
    const product = normalizeProduct(req.body as Partial<Product>);
    const { sql, values } = createProductQuery(product);
    const [result] = await db.query<ResultSetHeader>(sql, values);
    res.status(201).json({
      message: 'Product created',
      insertId: result.insertId,
    });
  } catch (err) {
    console.error('Create Product Error:', err);

    if (err instanceof Error && err.message.startsWith('Invalid ')) {
      res.status(400).json({ error: err.message });
      return;
    }

    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
