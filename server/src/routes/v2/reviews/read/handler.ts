import express from 'express';
import { RowDataPacket } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { SELECT_ALL_REVIEWS_QUERY } from '../sql';
import { toDateOnly } from '../shared/helpers';

const router = express.Router();

// Reviews are shown to every visitor, so listing them is public.
router.get('/', async (_req, res) => {
  console.log('GET /api/v2/reviews');

  try {
    const [rows] = await db.query<RowDataPacket[]>(SELECT_ALL_REVIEWS_QUERY);

    res.json({
      data: rows.map((row) => ({
        id: Number(row.id),
        reviewer_name: row.reviewer_name,
        source: row.source,
        star_count: Number(row.star_count),
        comment: row.comment,
        submit_date: toDateOnly(row.submit_date),
      })),
    });
  } catch (err) {
    console.error('List V2 Reviews Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
