import express from 'express';
import { db } from '../../ts-common/database';
import { verifyAuthToken, requireRole } from '../../ts-common/middleware';

const router = express.Router();

const parseNumericParam = (value: unknown, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
};

router.get('/', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log('GET /api/v2/audit');

  try {
    const page = Math.max(1, parseNumericParam(req.query.page, 1));
    const requestedPageSize = parseNumericParam(
      req.query.pageSize ?? req.query.limit,
      10
    );
    const pageSize = Math.min(Math.max(1, requestedPageSize), 200);
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const values: unknown[] = [];

    const addFilter = (field: string, value: unknown) => {
      if (value === undefined || value === null || `${value}`.trim() === '') {
        return;
      }

      filters.push(`${field} = ?`);
      values.push(value);
    };

    if (req.query.resource_type) {
      addFilter('resource_type', String(req.query.resource_type));
    }

    if (req.query.action_type) {
      addFilter('action_type', String(req.query.action_type));
    }

    if (req.query.actor_user_id) {
      addFilter('actor_user_id', String(req.query.actor_user_id));
    }

    if (req.query.source_endpoint) {
      addFilter('source_endpoint', String(req.query.source_endpoint));
    }

    if (req.query.resource_id) {
      addFilter('resource_id', String(req.query.resource_id));
    }

    if (req.query.created_after) {
      filters.push('created_at >= ?');
      values.push(String(req.query.created_after));
    }

    if (req.query.created_before) {
      filters.push('created_at <= ?');
      values.push(String(req.query.created_before));
    }

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const countSql = `SELECT COUNT(*) AS total_count FROM audit_events_v2 ${whereSql}`;
    const [countRows] = await db.query(countSql, values);
    const totalCount = Number(
      Array.isArray(countRows) && countRows.length
        ? (countRows[0] as { total_count?: number | string })?.total_count ?? 0
        : 0
    );

    const rowSql = `SELECT
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
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`;

    const [rows] = await db.query(rowSql, [...values, pageSize, offset]);

    res.json({
      total_count: totalCount,
      data: Array.isArray(rows) ? rows : [],
    });
  } catch (err) {
    console.error('V2 Audit Read Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
