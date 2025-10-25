import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../../ts-common/database';
import { User } from '../types';
import { ResultSetHeader } from 'mysql2';
import { encrypt } from '../../../ts-common/helpers';

const router = express.Router();

router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const updates = req.body as Partial<User>;

  try {
    // Build dynamic SQL query based on provided fields
    const fields = Object.keys(updates);
    const values: any[] = [];

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
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

    // Build the SET clause with encrypted values
    const setClause = Object.keys(encryptedUpdates)
      .map((field) => {
        values.push(encryptedUpdates[field as keyof User]);
        return `${field} = ?`;
      })
      .join(', ');

    const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
    values.push(id);

    const [result] = await db.query<ResultSetHeader>(sql, values);

    res.status(200).json({
      message: 'User updated',
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error('Update User Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
