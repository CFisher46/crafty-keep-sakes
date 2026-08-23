import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../../ts-common/database';
import { User } from '../types';
import { createUserQuery } from '../create/sql';
import { ResultSetHeader } from 'mysql2';
import { encrypt } from '../../../ts-common/helpers';
import { verifyAuthToken, requireRole } from '../../../ts-common/middleware';
import { insertAuditEvent } from '../../v2/audit-events';

const router = express.Router();

router.post('/', verifyAuthToken, requireRole('admin'), async (req, res) => {
  const user = req.body as User;

  try {
    const encryptedFirstName = encrypt(user.first_name);
    const encryptedLastName = encrypt(user.last_name);
    const encryptedAddressLine1 = encrypt(user.address_line1);
    const encryptedAddressLine2 = encrypt(user.address_line2);
    const encryptedAddressLine3 = encrypt(user.address_line3);
    const encryptedTelephoneNumber = encrypt(user.telephone_number);
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const newUser: User = {
      ...user,
      first_name: encryptedFirstName,
      last_name: encryptedLastName,
      address_line1: encryptedAddressLine1,
      address_line2: encryptedAddressLine2,
      address_line3: encryptedAddressLine3,
      telephone_number: encryptedTelephoneNumber,
      password: hashedPassword,
    };

    const { sql, values } = createUserQuery(newUser);
    const [result] = await db.query<ResultSetHeader>(sql, values);

    const actorUser = (req as any).user;
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
      actionType: 'CREATE',
      resourceType: 'users_legacy',
      resourceId: result.insertId,
      sourceEndpoint: 'POST /api/users',
      oldValuesJson: null,
      newValuesJson: {
        id: result.insertId,
        email_address: user.email_address,
        status: user.status ?? null,
      },
    });

    res.status(201).json({
      message: 'User created',
      insertId: result.insertId,
    });
  } catch (err) {
    console.error('Create User Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
