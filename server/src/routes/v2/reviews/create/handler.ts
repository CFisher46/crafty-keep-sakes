import express from "express";
import { db } from '../../../../ts-common/database';
import { createReviewV2Query } from '../sql';
import { insertAuditEvent } from '../../audit-events';
import { toInteger } from "../../../../ts-common/validators";
import { Review } from '../../../../ts-common/review-types';
import { requireRole, verifyAuthToken , getRequestUser} from "../../../../ts-common/middleware";
import { ResultSetHeader } from "mysql2";


const router = express.Router();

const normalizeReview = (input: Partial<Review>): Review => ({
    id: String(input.id ?? '').trim(),
    star_count: toInteger(input.star_count,'star_count'),
    source: String(input.source ?? '').trim(),
    comment: String(input.comment ?? '').trim(),
    submit_date: input.submit_date ?? new Date(),
});

router.post('/',verifyAuthToken,requireRole('admin'), async (req, res) => {
    console.log('POST /api/v2/reviews')

    const connection = await db.getConnection();

    try{
        const review = normalizeReview(req.body as Partial<Review>);
        await connection.beginTransaction();
        const {sql, values} = createReviewV2Query(review);
        const [insertResult] = await connection.query<ResultSetHeader>(sql,values)

        const actorUser = getRequestUser(req)

        const actorUserId =
      actorUser && typeof actorUser === 'object' && 'id' in actorUser
        ? Number(actorUser.id)
        : null;
    const actorRole =
      actorUser && typeof actorUser === 'object' && 'type' in actorUser
        ? String(actorUser.type)
        : null;

    await insertAuditEvent(connection, {
      actorUserId,
      actorRole,
      actionType: 'CREATE',
      resourceType: 'reviews_v2',
      resourceId: insertResult.insertId,
      sourceEndpoint: 'POST /api/v2/reviews',
      oldValuesJson: null,
      newValuesJson: {
        id: insertResult.insertId,
        star_count: review.star_count,
        source: review.source,
        comment: review.comment,
        submit_date: review.submit_date,
      },
    });
    await connection.commit();

    res.status(201).json({
      message: 'Review created',
      insertId: insertResult.insertId,
    });
  } catch (err) {
    await connection.rollback();

    if (err instanceof Error && err.message.startsWith('Invalid ')) {
      res.status(400).json({ error: err.message });
      return;
    }

    console.error('Create V2 Review Error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

export default router;

