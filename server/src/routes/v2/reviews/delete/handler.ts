import express from 'express';
import { RowDataPacket } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { requireRole, verifyAuthToken } from '../../../../ts-common/middleware';
import { insertAuditEvent } from '../../audit-events';
import { DELETE_REVIEW_QUERY, SELECT_REVIEW_BY_ID_QUERY } from '../sql';
import { getActor } from '../shared/helpers';
import { parseReviewId } from '../shared/validation';

const router = express.Router();

router.delete('/:id', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log(`DELETE /api/v2/reviews/${req.params.id}`);

  let reviewId: number;

  try {
    reviewId = parseReviewId(req.params.id);
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

    await connection.query(DELETE_REVIEW_QUERY, [reviewId]);

    await insertAuditEvent(connection, {
      ...getActor(req),
      actionType: 'DELETE',
      resourceType: 'reviews_v2',
      resourceId: reviewId,
      sourceEndpoint: `DELETE /api/v2/reviews/${reviewId}`,
      oldValuesJson: {
        id: reviewId,
        reviewer_name: previous.reviewer_name,
        source: previous.source,
        star_count: previous.star_count,
        comment: previous.comment,
        submit_date: previous.submit_date,
      },
      newValuesJson: null,
    });

    await connection.commit();

    res.json({ message: 'Review deleted', id: reviewId });
  } catch (err) {
    await connection.rollback();
    console.error('Delete V2 Review Error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

export default router;
