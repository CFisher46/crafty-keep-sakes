import express from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { getRequestUser, verifyAuthToken } from '../../../../ts-common/middleware';
import { toDateOnly } from '../shared/helpers';

const router = express.Router();
const MAX_COMMENT_LENGTH = 250;

const parseId = (value: unknown): string | null =>
  typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value) ? value : null;

const getUserId = (req: express.Request): string | null => {
  const user = getRequestUser(req);
  return user && (typeof user.id === 'number' || typeof user.id === 'string')
    ? parseId(String(user.id))
    : null;
};

const hasRecentPaidPurchase = async (userId: string, productId: string): Promise<boolean> => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT EXISTS (
       SELECT 1
       FROM orders_v2 o
       JOIN order_items_v2 oi ON oi.order_id = o.id
       JOIN invoices_v2 i ON i.order_id = o.id
       WHERE o.user_id = ?
         AND oi.product_id = ?
         AND o.order_status IN ('placed', 'fulfilled')
         AND i.invoice_status = 'paid'
         AND o.placed_at <= CURRENT_TIMESTAMP
         AND DATE_ADD(o.placed_at, INTERVAL 3 MONTH) >= CURRENT_TIMESTAMP
     ) AS has_recent_purchase`,
    [userId, productId]
  );
  return Number(rows[0]?.has_recent_purchase) === 1;
};

router.get('/:productId/reviews', async (req, res) => {
  const productId = parseId(req.params.productId);
  if (!productId) {
    res.status(400).json({ error: 'Invalid product id' });
    return;
  }

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id,
              match_description_rating,
              quality_rating,
              value_rating,
              ROUND((match_description_rating + quality_rating + value_rating) / 3, 2) AS star_count,
              comment,
              submitted_at
       FROM product_reviews_v2
       WHERE product_id = ?
       ORDER BY submitted_at DESC, id DESC`,
      [productId]
    );
    res.json({
      data: rows.map((row) => ({
        id: Number(row.id),
        reviewer_name: 'Verified purchaser',
        star_count: Number(row.star_count),
        match_description_rating: Number(row.match_description_rating),
        quality_rating: Number(row.quality_rating),
        value_rating: Number(row.value_rating),
        comment: String(row.comment),
        submit_date: toDateOnly(row.submitted_at as Date | string),
      })),
    });
  } catch (err) {
    console.error('List Product Reviews Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/:productId/eligibility', verifyAuthToken, async (req, res) => {
  const productId = parseId(req.params.productId);
  const userId = getUserId(req);
  if (!productId) {
    res.status(400).json({ error: 'Invalid product id' });
    return;
  }
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const hasRecentPurchase = await hasRecentPaidPurchase(userId, productId);
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT EXISTS (
         SELECT 1 FROM product_reviews_v2 WHERE user_id = ? AND product_id = ?
       ) AS has_review`,
      [userId, productId]
    );
    const hasReview = Number(rows[0]?.has_review) === 1;
    res.json({
      has_recent_purchase: hasRecentPurchase,
      has_review: hasReview,
      eligible: hasRecentPurchase && !hasReview,
    });
  } catch (err) {
    console.error('Check Product Review Eligibility Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/:productId/reviews', verifyAuthToken, async (req, res) => {
  const productId = parseId(req.params.productId);
  const userId = getUserId(req);
  const ratings = {
    match_description_rating: Number(req.body?.match_description_rating),
    quality_rating: Number(req.body?.quality_rating),
    value_rating: Number(req.body?.value_rating),
  };
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';

  if (!productId) {
    res.status(400).json({ error: 'Invalid product id' });
    return;
  }
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  for (const [field, rating] of Object.entries(ratings)) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: `Invalid ${field}: it must be a whole number from 1 to 5` });
      return;
    }
  }
  if (!comment || comment.length > MAX_COMMENT_LENGTH) {
    res.status(400).json({ error: `Invalid comment: it must be 1 to ${MAX_COMMENT_LENGTH} characters` });
    return;
  }

  try {
    const starCount = Number(
      (
        (ratings.match_description_rating + ratings.quality_rating + ratings.value_rating) /
        3
      ).toFixed(2)
    );
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO product_reviews_v2 (
         product_id, user_id, order_id, star_count,
         match_description_rating, quality_rating, value_rating, comment
       )
       SELECT ?, ?, o.id, ?, ?, ?, ?, ?
       FROM orders_v2 o
       JOIN order_items_v2 oi ON oi.order_id = o.id
       JOIN invoices_v2 i ON i.order_id = o.id
       WHERE o.user_id = ?
         AND oi.product_id = ?
         AND o.order_status IN ('placed', 'fulfilled')
         AND i.invoice_status = 'paid'
         AND o.placed_at <= CURRENT_TIMESTAMP
         AND DATE_ADD(o.placed_at, INTERVAL 3 MONTH) >= CURRENT_TIMESTAMP
         AND NOT EXISTS (
           SELECT 1 FROM product_reviews_v2
           WHERE user_id = ? AND product_id = ?
         )
       ORDER BY o.placed_at DESC
       LIMIT 1`,
      [
        productId,
        userId,
        starCount,
        ratings.match_description_rating,
        ratings.quality_rating,
        ratings.value_rating,
        comment,
        userId,
        productId,
        userId,
        productId,
      ]
    );

    if (result.affectedRows === 1) {
      res.status(201).json({ message: 'Product review created', id: result.insertId });
      return;
    }

    const [reviewRows] = await db.query<RowDataPacket[]>(
      `SELECT EXISTS (
         SELECT 1 FROM product_reviews_v2 WHERE user_id = ? AND product_id = ?
       ) AS has_review`,
      [userId, productId]
    );
    if (Number(reviewRows[0]?.has_review) === 1) {
      res.status(409).json({ error: 'You have already reviewed this product' });
      return;
    }

    if (!(await hasRecentPaidPurchase(userId, productId))) {
      res.status(403).json({ error: 'A paid purchase within the last three calendar months is required' });
      return;
    }
    res.status(409).json({ error: 'Review could not be submitted. Please try again.' });
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'You have already reviewed this product' });
      return;
    }
    console.error('Create Product Review Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
