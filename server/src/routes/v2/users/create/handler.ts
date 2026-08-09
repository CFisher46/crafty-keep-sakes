import express from 'express';
import bcrypt from 'bcryptjs';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { User } from '../../../users/types';
import { verifyAuthToken, requireRole } from '../../../../ts-common/middleware';
import { INSERT_USER_ACCOUNT_QUERY } from './sql';
import {
  INSERT_USER_ROLE_QUERY,
  SELECT_ROLE_ID_BY_CODE_QUERY,
  UPSERT_CUSTOMER_PROFILE_QUERY,
} from '../shared/sql';

const router = express.Router();

const normalizeOptionalText = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text : null;
};

router.post('/', verifyAuthToken, requireRole('admin'), async (req, res) => {
  const user = req.body as Partial<User>;

  if (!user.email_address || !user.password || !user.first_name || !user.last_name) {
    res.status(400).json({ error: 'Missing required user fields' });
    return;
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const hashedPassword = await bcrypt.hash(String(user.password), 10);
    const status = String(user.status || 'active');

    const [accountResult] = await connection.query<ResultSetHeader>(
      INSERT_USER_ACCOUNT_QUERY,
      [user.email_address, hashedPassword, status]
    );

    const userId = accountResult.insertId;

    await connection.query(UPSERT_CUSTOMER_PROFILE_QUERY, [
      userId,
      String(user.first_name),
      String(user.last_name),
      normalizeOptionalText(user.telephone_number),
      normalizeOptionalText(user.address_line1),
      normalizeOptionalText(user.address_line2),
      normalizeOptionalText(user.address_line3),
      normalizeOptionalText(user.town),
      normalizeOptionalText(user.county),
      normalizeOptionalText(user.postcode),
    ]);

    const roleCode = String(user.type || 'customer');
    const [roleRows] = await connection.query<RowDataPacket[]>(
      SELECT_ROLE_ID_BY_CODE_QUERY,
      [roleCode]
    );

    const roleId = roleRows[0]?.id;
    if (!roleId) {
      throw new Error(`Unknown role code: ${roleCode}`);
    }

    await connection.query(INSERT_USER_ROLE_QUERY, [userId, roleId]);

    await connection.commit();

    res.status(201).json({
      message: 'User created',
      insertId: userId,
    });
  } catch (err) {
    await connection.rollback();

    if (err instanceof Error && err.message.startsWith('Unknown role code:')) {
      res.status(400).json({ error: err.message });
      return;
    }

    console.error('Create V2 User Error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

export default router;