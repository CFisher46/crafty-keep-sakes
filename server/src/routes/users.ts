import express from "express";
import { db } from "../db/mysql";

const router = express.Router();

router.get("/", async (_req, res) => {
  console.log("GET /api/users called");
  try {
    const [rows] = await db.query("SELECT id FROM users");
    res.json(rows);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
