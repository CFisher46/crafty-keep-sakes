import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../../ts-common/database';
import { User } from '../types';
import { ResultSetHeader } from 'mysql2';
import { encrypt } from '../../../ts-common/helpers';
import { buildPartialUserUpdateQuery } from './sql';
import {
  verifyAuthToken,
  requireSelfOrAdmin,
  getRequestUser,
} from '../../../ts-common/middleware';
import { insertAuditEvent } from '../../v2/audit-events';

const router = express.Router();

router.put(
  '/:id',
  verifyAuthToken,
  requireSelfOrAdmin(),
  async (req, res): Promise<void> => {
  const id = req.params.id;
  const updates = req.body as Partial<User>;

  try {
    // Build dynamic SQL query based on provided fields
    const fields = Object.keys(updates);

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    // Encrypt fields that need encryption before updating
    const encryptedUpdates: Partial<User> = { ...updates };

    if (encryptedUpdates.first_name) {
      encryptedUpdates.first_name = encrypt(encryptedUpdates.first_name);
    }
    if (encryptedUpdates.last_name) {
      encryptedUpdates.last_name = encrypt(encryptedUpdates.last_name);
    }
    if (encryptedUpdates.address_line1) {
      encryptedUpdates.address_line1 = encrypt(encryptedUpdates.address_line1);
    }
    if (encryptedUpdates.address_line2) {
      encryptedUpdates.address_line2 = encrypt(encryptedUpdates.address_line2);
    }
    if (encryptedUpdates.address_line3) {
      encryptedUpdates.address_line3 = encrypt(encryptedUpdates.address_line3);
    }
    if (encryptedUpdates.telephone_number) {
      encryptedUpdates.telephone_number = encrypt(
        encryptedUpdates.telephone_number
      );
    }
    if (encryptedUpdates.password) {
      encryptedUpdates.password = await bcrypt.hash(
        encryptedUpdates.password,
        10
      );
    }

    const query = buildPartialUserUpdateQuery(encryptedUpdates, id);

    const [result] = await db.query<ResultSetHeader>(query.sql, query.values);

    const actorUser = getRequestUser(req);
    const actorUserId =
      actorUser && typeof actorUser === 'object' && 'id' in actorUser
        ? Number(actorUser.id)
        : null;
    const actorRole =
      actorUser && typeof actorUser === 'object' && 'type' in actorUser
        ? String(actorUser.type)
        : null;

    await insertAuditEvent(null, {
      actorUserId,
      actorRole,
      actionType: 'UPDATE',
      resourceType: 'users_legacy',
      resourceId: id,
      sourceEndpoint: `PUT /api/users/${id}`,
      oldValuesJson: null,
      newValuesJson: {
        id,
        ...updates,
      },
    });

    res.status(200).json({
      message: 'User updated',
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error('Update User Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
  }
);

export default router;
