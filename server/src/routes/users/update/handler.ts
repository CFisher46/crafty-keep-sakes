import express from "express";
import { db } from "../../../ts-common/database";
import { User } from "../types";
import { updateUserQuery } from "./sql";
import { ResultSetHeader } from "mysql2";

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const user = req.body as User;

  try {
    const { sql, values } = updateUserQuery(user, id);
    const [result] = await db.query<ResultSetHeader>(sql, values);
    res.status(200).json({
      message: "User updated",
      affectedRows: result.affectedRows
    });
  } catch (err) {
    console.error("Update User Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
