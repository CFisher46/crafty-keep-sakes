import express from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../ts-common/database';
import { getRequestUser, verifyAuthToken } from '../../ts-common/middleware';

const router = express.Router();

const getUserId = (req: express.Request): number => {
  const parsed = Number(getRequestUser(req)?.id);

  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid authenticated user');
  }

  return parsed;
};

const parseData = (value: unknown) => {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const handleError = (res: express.Response, label: string, err: unknown) => {
  console.error(label, err);
  if (err instanceof Error && err.message.includes('Invalid authenticated user')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.status(500).json({ error: 'Database error' });
};

router.get('/', verifyAuthToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(Math.max(Math.trunc(Number(req.query.limit)) || 50, 1), 100);
    const offset = Math.max(Math.trunc(Number(req.query.offset)) || 0, 0);
    const unreadOnly = req.query.unread === 'true';

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id, type, title, body, link, data_json, read_at, created_at
       FROM notifications_v2
       WHERE user_id = ? ${unreadOnly ? 'AND read_at IS NULL' : ''}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    res.json({
      data: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        link: row.link,
        data: parseData(row.data_json),
        read_at: row.read_at,
        created_at: row.created_at,
      })),
    });
  } catch (err) {
    handleError(res, 'List Notifications Error:', err);
  }
});

router.get('/unread-count', verifyAuthToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS unread FROM notifications_v2 WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );

    res.json({ unread: Number(rows[0]?.unread ?? 0) });
  } catch (err) {
    handleError(res, 'Unread Notifications Error:', err);
  }
});

router.put('/read-all', verifyAuthToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const [result] = await db.query<ResultSetHeader>(
      'UPDATE notifications_v2 SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );

    res.json({ message: 'Notifications marked as read', affectedRows: result.affectedRows });
  } catch (err) {
    handleError(res, 'Read All Notifications Error:', err);
  }
});

router.put('/:id/read', verifyAuthToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      res.status(400).json({ error: 'Invalid notification id' });
      return;
    }

    const [result] = await db.query<ResultSetHeader>(
      `UPDATE notifications_v2
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    handleError(res, 'Read Notification Error:', err);
  }
});

export default router;
