import { Request, Response } from "express";
import { db } from "../../../ts-common/database";

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, first_name, last_name, account_type } = req.body;

  try {
    const sql = `
      UPDATE users
      SET email = ?, first_name = ?, last_name = ?, account_type = ?
      WHERE id = ? AND is_active = 1
    `;
    const values = [email, first_name, last_name, account_type, id];

    const [result] = await db.query(sql, values);

    res.status(200).json({
      message: "User updated",
      affectedRows: (result as any).affectedRows
    });
  } catch (err) {
    console.error("Update User Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};
