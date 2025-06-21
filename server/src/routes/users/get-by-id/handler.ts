import express, { Request, Response } from "express";
import { db } from "../../../ts-common/database";
import { GetSpecificUsersQuery } from "./sql";

const router = express.Router();

router.get("/:id", async (req: Request, res: Response) => {
  console.log("GET /api/users/{user_id} called");
  const { id } = req.params;
  try {
    const [rows] = await db.query(GetSpecificUsersQuery(id));
    res.json(rows);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});
export default router;
