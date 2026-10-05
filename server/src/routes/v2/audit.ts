import express from 'express';
import { RowDataPacket } from 'mysql2';
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

const auditFilterFields = [
  'actor_user_id',
  'actor_role',
  'action_type',
  'resource_type',
  'source_endpoint',
] as const;

router.get('/filters', verifyAuthToken, requireRole('admin'), async (_req, res) => {
  try {
    const options: Record<(typeof auditFilterFields)[number], string[]> = {
      actor_user_id: [],
      actor_role: [],
      action_type: [],
      resource_type: [],
      source_endpoint: [],
    };

    await Promise.all(
      auditFilterFields.map(async (field) => {
        const [rows] = await db.query<(RowDataPacket & { value: string | number })[]>(
          `SELECT DISTINCT ${field} AS value
           FROM audit_events_v2
           WHERE ${field} IS NOT NULL
           ORDER BY ${field}`
        );
        options[field] = Array.isArray(rows)
          ? rows.map((row) => String(row.value))
          : [];
      })
    );

    res.json(options);
  } catch (err) {
    console.error('V2 Audit Filter Options Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log('GET /api/v2/audit');

  try {
    const page = Math.max(1, parseNumericParam(req.query.page, 1));
    const requestedPageSize = parseNumericParam(
      req.query.pageSize ?? req.query.limit,
      5
    );
    const pageSize = Math.min(Math.max(1, requestedPageSize), 200);
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const values: unknown[] = [];

    const addFilter = (field: string, value: unknown) => {
      const normalizedValues = (Array.isArray(value) ? value : [value])
        .filter((entry) => entry !== undefined && entry !== null)
        .map((entry) => String(entry).trim())
        .filter(Boolean);

      if (!normalizedValues.length) {
        return;
      }

      if (normalizedValues.length === 1) {
        filters.push(`${field} = ?`);
      } else {
        filters.push(`${field} IN (${normalizedValues.map(() => '?').join(', ')})`);
      }
      values.push(...normalizedValues);
    };

    if (req.query.resource_type) {
      addFilter('resource_type', req.query.resource_type);
    }

    if (req.query.action_type) {
      addFilter('action_type', req.query.action_type);
    }

    if (req.query.actor_role) {
      addFilter('actor_role', req.query.actor_role);
    }

    if (req.query.actor_user_id) {
      addFilter('actor_user_id', req.query.actor_user_id);
    }

    if (req.query.source_endpoint) {
      addFilter('source_endpoint', req.query.source_endpoint);
    }

    if (req.query.resource_id) {
      addFilter('resource_id', req.query.resource_id);
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
