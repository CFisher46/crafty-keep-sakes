import express from "express";
import { db } from "../../../ts-common/database";
import { GetAllUsersQuery } from "./sql";

const router = express.Router();

router.get("/", async (_req, res) => {
  console.log("GET /api/users called");
  try {
    const [rows] = await db.query(GetAllUsersQuery());
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
