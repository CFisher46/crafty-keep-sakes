import express, { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { db } from '../../ts-common/database';
import { verifyAuthToken, requireRole } from '../../ts-common/middleware';

const router = express.Router();

router.use(verifyAuthToken, requireRole('admin'));

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_INACTIVE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

type DateRange = { from?: string; to?: string };

const parseRange = (req: Request): DateRange | { error: string } => {
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;

  for (const value of [from, to]) {
    if (value && (!DATE_ONLY.test(value) || Number.isNaN(Date.parse(value)))) {
      return { error: 'Dates must be in YYYY-MM-DD format' };
    }
  }

  if (from && to && from > to) {
    return { error: 'The from date must not be after the to date' };
  }

  return { from: from || undefined, to: to || undefined };
};

// Builds an inclusive date filter on a column; "to" covers the whole of that day
const rangeClause = (column: string, { from, to }: DateRange) => {
  const sql: string[] = [];
  const params: string[] = [];

  if (from) {
    sql.push(`${column} >= ?`);
    params.push(from);
  }
  if (to) {
    sql.push(`${column} < DATE_ADD(?, INTERVAL 1 DAY)`);
    params.push(to);
  }

  return { sql: sql.map((part) => ` AND ${part}`).join(''), params };
};

const money = (value: unknown) => Number(Number(value || 0).toFixed(2));

const toIso = (value: unknown): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const handle =
  (label: string, run: (req: Request, range: DateRange) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    console.log(`GET /api/v2/reports/${label}`);

    const range = parseRange(req);
    if ('error' in range) {
      res.status(400).json({ error: range.error });
      return;
    }

    try {
      res.json({ data: await run(req, range) });
    } catch (err) {
      console.error(`V2 ${label} report error:`, err);
      res.status(500).json({ error: 'Database error' });
    }
  };

const DASHBOARD_DEFAULT_DAYS = 30;
const MONTHLY_AFTER_DAYS = 92;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (day: string, days: number) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDay(date);
};

// Every period in the range, so quiet days show as zero instead of being skipped
const listPeriods = (from: string, to: string, monthly: boolean) => {
  const periods: string[] = [];

  if (monthly) {
    const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
    while (isoDay(cursor) <= to) {
      periods.push(isoDay(cursor).slice(0, 7));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return periods;
  }

  for (let day = from; day <= to; day = addDays(day, 1)) {
    periods.push(day);
  }
  return periods;
};

router.get(
  '/overview',
  handle('overview', async (_req, range) => {
    const today = isoDay(new Date());
    const to = range.to ?? (range.from && range.from > today ? range.from : today);
    const from = range.from ?? addDays(to, -(DASHBOARD_DEFAULT_DAYS - 1));

    const spanDays = Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
    const monthly = spanDays > MONTHLY_AFTER_DAYS;
    const resolved = { from, to };

    const orders = rangeClause('o.placed_at', resolved);
    const [totals] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(o.grand_total), 0) AS revenue,
              COUNT(DISTINCT o.user_id) AS customers
       FROM orders_v2 o WHERE o.order_status <> 'cancelled'${orders.sql}`,
      orders.params
    );
    const [units] = await db.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(oi.quantity), 0) AS units
       FROM order_items_v2 oi JOIN orders_v2 o ON o.id = oi.order_id
       WHERE o.order_status <> 'cancelled'${orders.sql}`,
      orders.params
    );
    const registered = rangeClause('u.created_at', resolved);
    const [users] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS new_users FROM users_v2 u WHERE 1 = 1${registered.sql}`,
      registered.params
    );
    const [seriesRows] = await db.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(o.placed_at, '${monthly ? '%Y-%m' : '%Y-%m-%d'}') AS period,
              COUNT(*) AS orders, COALESCE(SUM(o.grand_total), 0) AS revenue
       FROM orders_v2 o WHERE o.order_status <> 'cancelled'${orders.sql}
       GROUP BY period`,
      orders.params
    );
    const [topRows] = await db.query<RowDataPacket[]>(
      `SELECT oi.product_name_snapshot AS product_name, SUM(oi.quantity) AS units
       FROM order_items_v2 oi JOIN orders_v2 o ON o.id = oi.order_id
       WHERE o.order_status <> 'cancelled'${orders.sql}
       GROUP BY oi.product_name_snapshot ORDER BY units DESC, product_name ASC LIMIT 5`,
      orders.params
    );

    const byPeriod = new Map(seriesRows.map((row) => [String(row.period), row]));

    return {
      from,
      to,
      granularity: monthly ? 'month' : 'day',
      totals: {
        orders: Number(totals[0]?.orders ?? 0),
        revenue: money(totals[0]?.revenue),
        customers: Number(totals[0]?.customers ?? 0),
        units: Number(units[0]?.units ?? 0),
        new_users: Number(users[0]?.new_users ?? 0),
      },
      series: listPeriods(from, to, monthly).map((period) => ({
        period,
        orders: Number(byPeriod.get(period)?.orders ?? 0),
        revenue: money(byPeriod.get(period)?.revenue),
      })),
      top_products: topRows.map((row) => ({
        product_name: row.product_name,
        units: Number(row.units),
      })),
    };
  })
);

router.get(
  '/products',
  handle('products', async (_req, range) => {
    const orders = rangeClause('o.placed_at', range);
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.id, p.sku, p.product_name, p.quantity AS stock,
              COALESCE(SUM(oi.quantity), 0) AS units_sold,
              COALESCE(SUM(oi.line_total), 0) AS revenue,
              COUNT(DISTINCT o.id) AS orders
       FROM products_v2 p
       LEFT JOIN (
         order_items_v2 oi
         INNER JOIN orders_v2 o ON o.id = oi.order_id AND o.order_status <> 'cancelled'${orders.sql}
       ) ON oi.product_id = p.id
       WHERE p.deleted_at IS NULL
       GROUP BY p.id, p.sku, p.product_name, p.quantity
       ORDER BY units_sold DESC, p.product_name ASC`,
      orders.params
    );

    return rows.map((row) => ({
      id: Number(row.id),
      sku: row.sku,
      product_name: row.product_name,
      stock: Number(row.stock),
      units_sold: Number(row.units_sold),
      revenue: money(row.revenue),
      orders: Number(row.orders),
    }));
  })
);

router.get(
  '/users',
  handle('users', async (req, range) => {
    const requested = Number(req.query.inactiveDays);
    const inactiveDays =
      Number.isInteger(requested) && requested >= 1 && requested <= 3650
        ? requested
        : DEFAULT_INACTIVE_DAYS;
    const orders = rangeClause('o.placed_at', range);

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.email, u.status, u.created_at, u.last_login_at,
              cp.first_name, cp.last_name,
              COALESCE((SELECT MIN(r.code) FROM user_roles_v2 ur
                        JOIN roles_v2 r ON r.id = ur.role_id
                        WHERE ur.user_id = u.id), 'customer') AS role_code,
              COUNT(DISTINCT o.id) AS orders,
              COALESCE(SUM(o.grand_total), 0) AS total_spent,
              MAX(o.placed_at) AS last_order_at
       FROM users_v2 u
       LEFT JOIN customer_profiles_v2 cp ON cp.user_id = u.id
       LEFT JOIN orders_v2 o ON o.user_id = u.id AND o.order_status <> 'cancelled'${orders.sql}
       GROUP BY u.id, u.email, u.status, u.created_at, u.last_login_at, cp.first_name, cp.last_name
       ORDER BY u.last_login_at IS NULL DESC, u.last_login_at ASC, u.email ASC`,
      orders.params
    );

    const cutoff = Date.now() - inactiveDays * DAY_MS;

    const users = rows.map((row) => {
      const lastLogin = toIso(row.last_login_at);
      const created = toIso(row.created_at);
      // Accounts that predate login tracking have no login date, so fall back to when they were created
      const lastSeen = lastLogin ?? created;
      const daysSinceLogin = lastLogin
        ? Math.floor((Date.now() - new Date(lastLogin).getTime()) / DAY_MS)
        : null;

      return {
        id: Number(row.id),
        name: [row.first_name, row.last_name].filter(Boolean).join(' ') || null,
        email: row.email,
        role: row.role_code,
        status: row.status,
        created_at: created,
        last_login_at: lastLogin,
        days_since_login: daysSinceLogin,
        is_dormant: lastSeen ? new Date(lastSeen).getTime() < cutoff : false,
        orders: Number(row.orders),
        total_spent: money(row.total_spent),
        last_order_at: toIso(row.last_order_at),
      };
    });

    return { inactive_days: inactiveDays, users };
  })
);

router.get(
  '/blog',
  handle('blog', async (_req, range) => {
    const views = rangeClause('v.viewed_at', range);
    const comments = rangeClause('c.created_at', range);
    const likes = rangeClause('r.created_at', range);

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT p.id, p.title, p.created_at, cp.first_name, cp.last_name,
              (SELECT COUNT(*) FROM blog_post_views_v2 v WHERE v.post_id = p.id${views.sql}) AS viewers,
              (SELECT COUNT(*) FROM blog_post_comments_v2 c WHERE c.post_id = p.id${comments.sql}) AS comments,
              (SELECT COUNT(*) FROM blog_post_reactions_v2 r
                 WHERE r.post_id = p.id AND r.reaction_type = 'like'${likes.sql}) AS likes,
              (SELECT COUNT(*) FROM blog_post_reactions_v2 r
                 WHERE r.post_id = p.id AND r.reaction_type = 'dislike'${likes.sql}) AS dislikes
       FROM blog_posts_v2 p
       LEFT JOIN customer_profiles_v2 cp ON cp.user_id = p.author_id
       ORDER BY (comments + likes + dislikes + viewers) DESC, p.created_at DESC`,
      [...views.params, ...comments.params, ...likes.params, ...likes.params]
    );

    return rows.map((row) => {
      const comments = Number(row.comments);
      const likes = Number(row.likes);
      const dislikes = Number(row.dislikes);

      return {
        id: Number(row.id),
        title: row.title,
        author: [row.first_name, row.last_name].filter(Boolean).join(' ') || null,
        created_at: toIso(row.created_at),
        viewers: Number(row.viewers),
        comments,
        likes,
        dislikes,
        engagement: comments + likes + dislikes,
      };
    });
  })
);

export default router;
