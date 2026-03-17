import express from 'express';
import { db } from '../../../../ts-common/database';
import { Product } from '../../types';
import { ADD_IMAGES_TO_PRODUCT_QUERY } from './sql';

const router = express.Router();

router.post('/:id/images/upload', async (req, res) => {
  const product = req.body as Product;
  try {
    const [result] = await db.query(ADD_IMAGES_TO_PRODUCT_QUERY, [
      product.id,
      product.images,
    ]);
    res.json(product.images);
  } catch (error) {
    console.error(`Error uploading images for product ${product.id}:`, error);
    res.status(500).json({ error: 'Failed to upload product images' });
  }
});
