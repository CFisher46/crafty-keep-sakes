import express from "express";
import { db } from "../../../ts-common/database";
import { User } from "../types";
import { createUserQuery } from "../create/sql";
import { ResultSetHeader } from "mysql2";

const router = express.Router();

router.post("/", async (req, res) => {
  const user = req.body as User;

  try {
    const { sql, values } = createUserQuery(user);
    const [result] = await db.query<ResultSetHeader>(sql, values);
    res.status(201).json({
      message: "User created",
      insertId: result.insertId
    });
  } catch (err) {
    console.error("Create Product Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
