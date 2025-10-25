import express from 'express';
import { db } from '../../../ts-common/database';
import { getAudits } from './sql';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { user } = req.query;

    let query;
    let values: any[] = [];

    if (user) {
      const { sql, values: queryValues } = getAudits(user as string);
      query = sql;
      values = queryValues;
    } else {
      query = getAllAudits();
    }

    const [rows] = await db.query(query, values);
    res.json({ data: rows });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
