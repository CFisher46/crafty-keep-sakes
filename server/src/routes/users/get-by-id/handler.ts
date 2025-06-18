import express, { Request, Response } from "express";
import { db } from "../../../ts-common/database";

// Utility to format user row for consistent return shape

const router = express.Router();

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE id = ? AND is_active = 1",
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});
export default router;
