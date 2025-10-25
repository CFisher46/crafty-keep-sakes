import express from 'express';
import { db } from '../../../ts-common/database';
import { getAudits } from './sql';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { user } = req.query;

    let query;
    let values: any[] = [];

    query = getAudits();

    const [rows] = await db.query(query, values);

    // Parse the JSON result similar to your products/users endpoints
    const parsedResult = JSON.parse(
      (rows as { result: string }[])?.[0]?.result || '{}'
    );

    // Parse the stringified data array if it exists
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
