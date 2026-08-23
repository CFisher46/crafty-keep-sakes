import express from 'express';
import { ResultSetHeader } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { verifyAuthToken, requireRole } from '../../../../ts-common/middleware';
import { insertAuditEvent } from '../../audit-events';

const router = express.Router();

router.delete('/:id', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log(`DELETE /api/v2/users/${req.params.id}`);

  const { id } = req.params;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      'DELETE FROM users_v2 WHERE id = ?',
      [id]
    );

    if (!result.affectedRows) {
      await connection.rollback();
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const actorUser = getRequestUser(req);
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
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    connection.release();
  }
});

export default router;