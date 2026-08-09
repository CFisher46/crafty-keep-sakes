import express from 'express';
import { ResultSetHeader } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { verifyAuthToken, requireRole } from '../../../../ts-common/middleware';

const router = express.Router();

router.delete('/:id', verifyAuthToken, requireRole('admin'), async (req, res) => {
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