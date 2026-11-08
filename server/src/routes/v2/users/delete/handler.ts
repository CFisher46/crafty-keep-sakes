import express from 'express';
import { ResultSetHeader } from 'mysql2';
import { db } from '../../../../ts-common/database';
import {
  verifyAuthToken,
  requireRole,
  getRequestUser,
} from '../../../../ts-common/middleware';
import { insertAuditEvent } from '../../audit-events';

const router = express.Router();

const isReferencedRowError = (
  error: unknown
): error is { code: string } =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'ER_ROW_IS_REFERENCED_2';

router.delete('/:id', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log(`DELETE /api/v2/users/${req.params.id}`);

  const id = String(req.params.id);
  let connection: Awaited<ReturnType<typeof db.getConnection>>;
  try {
    connection = await db.getConnection();
  } catch (error) {
    console.error('Delete V2 User Connection Error:', error);
    res.status(500).json({ code: 'USER_DELETE_FAILED', error: 'Failed to delete user' });
    return;
  }

  try {
    await connection.beginTransaction();

    await connection.query(
      'UPDATE blog_post_comments_v2 SET user_id = NULL WHERE user_id = ?',
      [id]
    );
    await connection.query(
      'UPDATE blog_post_views_v2 SET user_id = NULL WHERE user_id = ?',
      [id]
    );
    await connection.query(
      'UPDATE blog_post_reactions_v2 SET user_id = NULL WHERE user_id = ?',
      [id]
    );
    await connection.query(
      'DELETE FROM email_verification_tokens_v2 WHERE user_id = ?',
      [id]
    );

    const [result] = await connection.query<ResultSetHeader>(
      'DELETE FROM users_v2 WHERE id = ?',
      [id]
    );

    if (!result.affectedRows) {
      await connection.rollback();
      res.status(404).json({ code: 'USER_NOT_FOUND', error: 'User not found' });
      return;
    }

    const actorUser = getRequestUser(req);
    const requestActorUserId =
      actorUser && typeof actorUser === 'object' && 'id' in actorUser
        ? Number(actorUser.id)
        : null;
    const actorUserId = String(requestActorUserId) === id ? null : requestActorUserId;
    const actorRole =
      actorUser && typeof actorUser === 'object' && 'type' in actorUser
        ? String(actorUser.type)
        : null;

    await insertAuditEvent(connection, {
      actorUserId,
      actorRole,
      actionType: 'DELETE',
      resourceType: 'users_v2',
      resourceId: id,
      sourceEndpoint: `DELETE /api/v2/users/${id}`,
      oldValuesJson: {
        id,
      },
      newValuesJson: null,
    });

    await connection.commit();

    res.status(200).json(result);
  } catch (error) {
    await connection.rollback();
    console.error('Delete V2 User Error:', error);
    if (isReferencedRowError(error)) {
      res.status(409).json({
        code: 'USER_HAS_DEPENDENCIES',
        error:
          'This user has orders or authored blog posts that must be reassigned or resolved before the account can be deleted.',
      });
      return;
    }
    res.status(500).json({ code: 'USER_DELETE_FAILED', error: 'Failed to delete user' });
  } finally {
    connection.release();
  }
});

export default router;