import express from 'express';
import bcrypt from 'bcryptjs';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { User } from '../../../../ts-common/user-types';
import {
  verifyAuthToken,
  requireSelfOrAdmin,
  getRequestUser,
} from '../../../../ts-common/middleware';
import {
  DELETE_USER_ROLE_QUERY,
  INSERT_USER_ROLE_QUERY,
  SELECT_ROLE_ID_BY_CODE_QUERY,
  UPSERT_CUSTOMER_PROFILE_QUERY,
} from '../shared/sql';
import { insertAuditEvent } from '../../audit-events';
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
    const [existingUserRows] = await connection.query<RowDataPacket[]>(
      `SELECT
         u.id,
         u.email,
         u.status,
         cp.first_name,
         cp.last_name,
         cp.telephone AS telephone_number,
         cp.address_line1,
         cp.address_line2,
         cp.address_line3,
         cp.town,
         cp.county,
         cp.postcode,
         COALESCE(r.code, 'customer') AS role_code
       FROM users_v2 u
       LEFT JOIN customer_profiles_v2 cp ON cp.user_id = u.id
       LEFT JOIN user_roles_v2 ur ON ur.user_id = u.id
       LEFT JOIN roles_v2 r ON r.id = ur.role_id
       WHERE u.id = ?
       LIMIT 1`,
      [id]
    );

    const previousUser = Array.isArray(existingUserRows) ? existingUserRows[0] ?? null : null;

    if (!previousUser) {
      await connection.rollback();
      res.status(404).json({ error: 'User not found' });
      return;
    }

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
      const profileValues = [
        id,
        normalizeOptionalText(updates.first_name ?? previousUser.first_name),
        normalizeOptionalText(updates.last_name ?? previousUser.last_name),
        normalizeOptionalText(updates.telephone_number ?? previousUser.telephone_number),
        normalizeOptionalText(updates.address_line1 ?? previousUser.address_line1),
        normalizeOptionalText(updates.address_line2 ?? previousUser.address_line2),
        normalizeOptionalText(updates.address_line3 ?? previousUser.address_line3),
        normalizeOptionalText(updates.town ?? previousUser.town),
        normalizeOptionalText(updates.county ?? previousUser.county),
        normalizeOptionalText(updates.postcode ?? previousUser.postcode),
      ];

      await connection.query(UPSERT_CUSTOMER_PROFILE_QUERY, profileValues);
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

    const actorUser = getRequestUser(req);
    const actorUserId =
      actorUser && typeof actorUser === 'object' && 'id' in actorUser
        ? Number(actorUser.id)
        : null;
    const actorRole =
      actorUser && typeof actorUser === 'object' && 'type' in actorUser
        ? String(actorUser.type)
        : null;

    const nextUserState = {
      id,
      email_address: updates.email_address ?? previousUser?.email ?? null,
      status: updates.status ?? previousUser?.status ?? null,
      type: updates.type ?? previousUser?.role_code ?? null,
      first_name: updates.first_name ?? previousUser?.first_name ?? null,
      last_name: updates.last_name ?? previousUser?.last_name ?? null,
      telephone_number: updates.telephone_number ?? previousUser?.telephone_number ?? null,
      address_line1: updates.address_line1 ?? previousUser?.address_line1 ?? null,
      address_line2: updates.address_line2 ?? previousUser?.address_line2 ?? null,
      address_line3: updates.address_line3 ?? previousUser?.address_line3 ?? null,
      town: updates.town ?? previousUser?.town ?? null,
      county: updates.county ?? previousUser?.county ?? null,
      postcode: updates.postcode ?? previousUser?.postcode ?? null,
    };

    await insertAuditEvent(connection, {
      actorUserId,
      actorRole,
      actionType: 'UPDATE',
      resourceType: 'users_v2',
      resourceId: id,
      sourceEndpoint: `PUT /api/v2/users/${id}`,
      oldValuesJson: previousUser
        ? {
            id: Number(previousUser.id),
            email_address: previousUser.email ?? null,
            status: previousUser.status ?? null,
            type: previousUser.role_code ?? null,
            first_name: previousUser.first_name ?? null,
            last_name: previousUser.last_name ?? null,
            telephone_number: previousUser.telephone_number ?? null,
            address_line1: previousUser.address_line1 ?? null,
            address_line2: previousUser.address_line2 ?? null,
            address_line3: previousUser.address_line3 ?? null,
            town: previousUser.town ?? null,
            county: previousUser.county ?? null,
            postcode: previousUser.postcode ?? null,
          }
        : null,
      newValuesJson: nextUserState,
    });

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