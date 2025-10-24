import express from 'express';
import { db } from '../../../ts-common/database';
import { GetAllUsersQuery } from './sql';
import { decrypt } from '../../../ts-common/helpers';
import { User } from '../types';

const router = express.Router();

router.get('/', async (_req, res) => {
  console.log('GET /api/users called');
  try {
    const [rows] = await db.query(GetAllUsersQuery());

    const parsedResult = JSON.parse(
      (rows as { result: string }[])?.[0]?.result || '{}'
    );

    // Parse the `data` field again since it is a JSON string
    const userData = JSON.parse(parsedResult.data || '[]');

    // Ensure userData is an array
    const users = Array.isArray(userData)
      ? userData.map((user: User) => {
          try {
            return {
              ...user,
              first_name: decrypt(user.first_name),
              last_name: decrypt(user.last_name),
            };
          } catch (err) {
            console.error('Decryption Error for User:', user, err);
            return user; // Return the user as-is if decryption fails
          }
        })
      : [];

    res.json(users);
  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
