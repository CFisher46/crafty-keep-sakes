import express from "express";
import { db } from "../../../ts-common/database";

const router = express.Router();

router.get("/", async (_req, res) => {
  console.log("GET /api/products called");
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE is_active = 1");
    const parsedResult = JSON.parse(
      (rows as { result: string }[])?.[0]?.result || "{}"
    );
    res.json(parsedResult);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
