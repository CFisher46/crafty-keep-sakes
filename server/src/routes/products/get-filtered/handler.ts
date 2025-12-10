import express from 'express';
import { db } from '../../../ts-common/database';
import { GetAllProductsQuery } from '../get/sql';
import { DefaultQueryParams } from '../../../ts-common/types';

const router = express.Router();

router.get('/filter', async (req, res) => {
  console.log('GET /api/products/filter');

  try {
    const { product_name, ...restQuery } = req.query;
    const queryStringParams = restQuery as DefaultQueryParams;
    const productName = product_name as string;

    const [rows] = await db.query(
      GetAllProductsQuery(queryStringParams, productName)
    );

    const parsedResult = JSON.parse(
      (rows as { result: string }[])?.[0]?.result || '{}'
    );

    if (Array.isArray(parsedResult?.data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsedResult.data = parsedResult.data.map((product: any) => {
        if (typeof product.images === 'string') {
          try {
            product.images = JSON.parse(product.images);
          } catch (err) {
            console.warn('Failed to parse product.images', err);
            product.images = [];
          }
        }
        return product;
      });
    }

    res.json(parsedResult);
  } catch (err) {
    console.error('Filter DB Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
