import express from 'express';
import { db } from '../../../ts-common/database';
import { getAudits } from './sql';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const query = getAudits();
    const values: string[] = [];
    const [rows] = await db.query(query, values);
    const parsedResult = JSON.parse(
      (rows as { result: string }[])?.[0]?.result || '{}'
    );
    if (parsedResult.data && typeof parsedResult.data === 'string') {
      parsedResult.data = JSON.parse(parsedResult.data);
    }
    res.json(parsedResult);
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
