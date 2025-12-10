import express from 'express';
import { db } from '../../../ts-common/database';
import { Product } from '../types';
import { createProductQuery } from './sql';
import { ResultSetHeader } from 'mysql2';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('POST /api/products');
  const product = req.body as Product;

  try {
    const { sql, values } = createProductQuery(product);
    const [result] = await db.query<ResultSetHeader>(sql, values);
    res.status(201).json({
      message: 'Product created',
      insertId: result.insertId,
    });
  } catch (err) {
    console.error('Create Product Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
