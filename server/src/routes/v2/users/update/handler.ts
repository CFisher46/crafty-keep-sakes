import express from 'express';
import bcrypt from 'bcryptjs';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { User } from '../../../users/types';
import {
  verifyAuthToken,
  requireSelfOrAdmin,
} from '../../../../ts-common/middleware';
import {
  DELETE_USER_ROLE_QUERY,
  INSERT_USER_ROLE_QUERY,
  SELECT_ROLE_ID_BY_CODE_QUERY,
  UPSERT_CUSTOMER_PROFILE_QUERY,
} from '../shared/sql';
import { buildUserAccountUpdateQuery } from './sql';

const router = express.Router();

const normalizeOptionalText = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text : null;
};

router.put('/:id', verifyAuthToken, requireSelfOrAdmin(), async (req, res) => {
  console.log(`PUT /api/v2/users/${req.params.id}`);

  const id = req.params.id;
  const updates = req.body as Partial<User>;
  const connection = await db.getConnection();

  try {
    const accountUpdates: Array<[string, string | number | null]> = [];

    if (updates.email_address !== undefined) {
      accountUpdates.push(['email', String(updates.email_address).trim()]);
    }

    if (updates.password !== undefined) {
      accountUpdates.push(['password_hash', await bcrypt.hash(String(updates.password), 10)]);
    }

    if (updates.status !== undefined) {
      accountUpdates.push(['status', String(updates.status)]);
    }

    const hasProfileUpdates = [
      updates.first_name,
      updates.last_name,
      updates.telephone_number,
      updates.address_line1,
      updates.address_line2,
      updates.address_line3,
      updates.town,
      updates.county,
      updates.postcode,
    ].some((value) => value !== undefined);

    const hasRoleUpdate = updates.type !== undefined;

    if (!accountUpdates.length && !hasProfileUpdates && !hasRoleUpdate) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    await connection.beginTransaction();

    if (accountUpdates.length) {
      const query = buildUserAccountUpdateQuery(accountUpdates);
      const values = [...query.values, id];
      const [accountResult] = await connection.query<ResultSetHeader>(query.sql, values);

      if (!accountResult.affectedRows) {
        await connection.rollback();
        res.status(404).json({ error: 'User not found' });
        return;
      }
    }

    if (hasProfileUpdates) {
      await connection.query(UPSERT_CUSTOMER_PROFILE_QUERY, [
        id,
        normalizeOptionalText(updates.first_name),
        normalizeOptionalText(updates.last_name),
        normalizeOptionalText(updates.telephone_number),
        normalizeOptionalText(updates.address_line1),
        normalizeOptionalText(updates.address_line2),
        normalizeOptionalText(updates.address_line3),
        normalizeOptionalText(updates.town),
        normalizeOptionalText(updates.county),
        normalizeOptionalText(updates.postcode),
      ]);
    }

    if (hasRoleUpdate) {
      const roleCode = String(updates.type || 'customer');
      const [roleRows] = await connection.query<RowDataPacket[]>(
        SELECT_ROLE_ID_BY_CODE_QUERY,
        [roleCode]
      );

      const roleId = roleRows[0]?.id;
      if (!roleId) {
        throw new Error(`Unknown role code: ${roleCode}`);
      }

      await connection.query(DELETE_USER_ROLE_QUERY, [id]);
      await connection.query(INSERT_USER_ROLE_QUERY, [id, roleId]);
    }

    await connection.commit();

    res.status(200).json({
      message: 'User updated',
      affectedRows: 1,
    });
  } catch (err) {
    await connection.rollback();

    if (err instanceof Error && err.message.startsWith('Unknown role code:')) {
      res.status(400).json({ error: err.message });
      return;
    }

    console.error('Update V2 User Error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

export default router;