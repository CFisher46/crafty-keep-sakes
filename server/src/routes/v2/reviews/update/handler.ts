import express from 'express';
import { RowDataPacket } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { requireRole, verifyAuthToken } from '../../../../ts-common/middleware';
import { ReviewInput } from '../../../../ts-common/review-types';
import { insertAuditEvent } from '../../audit-events';
import { SELECT_REVIEW_BY_ID_QUERY, buildReviewUpdateQuery } from '../sql';
import { getActor } from '../shared/helpers';
import { normalizeReviewUpdate, parseReviewId } from '../shared/validation';

const router = express.Router();

router.put('/:id', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log(`PUT /api/v2/reviews/${req.params.id}`);

  let reviewId: number;
  let updates: Partial<ReviewInput>;

  try {
    reviewId = parseReviewId(req.params.id);
    updates = normalizeReviewUpdate(req.body as Partial<ReviewInput>);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query<RowDataPacket[]>(SELECT_REVIEW_BY_ID_QUERY, [reviewId]);
    const previous = existingRows[0];

    if (!previous) {
      await connection.rollback();
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const { sql, values } = buildReviewUpdateQuery(updates, reviewId);
    await connection.query(sql, values);

    await insertAuditEvent(connection, {
      ...getActor(req),
      actionType: 'UPDATE',
      resourceType: 'reviews_v2',
      resourceId: reviewId,
      sourceEndpoint: `PUT /api/v2/reviews/${reviewId}`,
      oldValuesJson: {
        id: reviewId,
        reviewer_name: previous.reviewer_name,
        source: previous.source,
        star_count: previous.star_count,
        comment: previous.comment,
        submit_date: previous.submit_date,
      },
      newValuesJson: { id: reviewId, ...updates },
    });

    await connection.commit();

    res.json({ message: 'Review updated', id: reviewId });
  } catch (err) {
    await connection.rollback();
    console.error('Update V2 Review Error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

export default router;
