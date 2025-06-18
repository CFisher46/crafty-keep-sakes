import { Request, Response } from "express";
import { db } from "../../../ts-common/database";

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const sql = "UPDATE users SET is_active = 0 WHERE id = ?";
    const [result] = await db.query(sql, [id]);
    res.status(200).json({
      message: "User deactivated",
      affectedRows: (result as any).affectedRows
    });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};
