import express from 'express';
import { db } from '../../../ts-common/database';
import { createAuditLogQuery } from './sql';
import { Audit } from '../types';
import { ResultSetHeader } from 'mysql2';

const router = express.Router();

router.post('/', async (req, res) => {
  const audit: Audit = req.body;

  try {
    const { sql, values } = createAuditLogQuery(audit);
    const [result] = await db.query<ResultSetHeader>(sql, values);

    res.status(201).json({
      log_ref: result.insertId,
      ...audit,
      log_dttm: new Date(),
    });
  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

export default router;
