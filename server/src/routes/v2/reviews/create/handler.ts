import express from 'express';
import { ResultSetHeader } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { requireRole, verifyAuthToken } from '../../../../ts-common/middleware';
import { ReviewInput } from '../../../../ts-common/review-types';
import { insertAuditEvent } from '../../audit-events';
import { INSERT_REVIEW_QUERY } from '../sql';
import { getActor } from '../shared/helpers';
import { normalizeReviewInput } from '../shared/validation';

const router = express.Router();

router.post('/', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log('POST /api/v2/reviews');

  let review: ReviewInput;

  try {
    review = normalizeReviewInput(req.body as Partial<ReviewInput>);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [insertResult] = await connection.query<ResultSetHeader>(INSERT_REVIEW_QUERY, [
      review.reviewer_name,
      review.source,
      review.submit_date,
      review.star_count,
      review.comment,
    ]);

    await insertAuditEvent(connection, {
      ...getActor(req),
      actionType: 'CREATE',
      resourceType: 'reviews_v2',
      resourceId: insertResult.insertId,
      sourceEndpoint: 'POST /api/v2/reviews',
      oldValuesJson: null,
      newValuesJson: { id: insertResult.insertId, ...review },
    });

    await connection.commit();

    res.status(201).json({ message: 'Review created', insertId: insertResult.insertId });
  } catch (err) {
    await connection.rollback();
    console.error('Create V2 Review Error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

export default router;
