import express from 'express';
import { db } from '../../ts-common/database';
import { verifyAuthToken, requireRole } from '../../ts-common/middleware';

const router = express.Router();

router.get('/', verifyAuthToken, requireRole('admin'), async (_req, res) => {
  console.log('GET /api/v2/audit');

  try {
    const [rows] = await db.query(
      `SELECT
         id,
         actor_user_id,
         actor_role,
         action_type,
         resource_type,
         resource_id,
         source_endpoint,
         old_values_json,
         new_values_json,
         created_at
       FROM audit_events_v2
       ORDER BY created_at DESC
       LIMIT 200`
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error('V2 Audit Read Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
