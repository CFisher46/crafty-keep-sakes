import express from 'express';
import { db } from '../../../../ts-common/database';
import {
  buildAllUsersQuery,
  buildUserByIdQuery,
  V2UserRow,
} from './sql';
import {
  requireSelfOrAdmin,
  verifyAuthToken,
  requireRole,
} from '../../../../ts-common/middleware';

const router = express.Router();

const mapUserRow = (user: V2UserRow) => ({
  id: String(user.id),
  email_address: user.email,
  first_name: user.first_name ?? '',
  last_name: user.last_name ?? '',
  address_line1: user.address_line1 ?? '',
  address_line2: user.address_line2 ?? '',
  address_line3: user.address_line3 ?? '',
  town: user.town ?? '',
  county: user.county ?? '',
  postcode: user.postcode ?? '',
  telephone_number: user.telephone_number ?? '',
  type: user.type ?? 'customer',
  status: user.status,
  invoice_id: null,
  password: '',
});

router.get('/', verifyAuthToken, requireRole('admin'), async (_req, res) => {
  console.log('GET /api/v2/users');

  try {
    const [rows] = await db.query(buildAllUsersQuery());
    const users = Array.isArray(rows)
      ? (rows as V2UserRow[]).map((user) => mapUserRow(user))
      : [];

    res.json(users);
  } catch (err) {
    console.error('V2 Users DB Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/:id', verifyAuthToken, requireSelfOrAdmin(), async (req, res) => {
  console.log(`GET /api/v2/users/${req.params.id}`);

  const { id } = req.params;

  try {
    const [rows] = await db.query(buildUserByIdQuery(), [id, id]);
    const user = Array.isArray(rows) ? (rows as V2UserRow[])[0] : undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(mapUserRow(user));
  } catch (err) {
    console.error('V2 User By Id DB Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;