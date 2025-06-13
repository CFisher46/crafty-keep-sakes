import express from "express";
import { db } from "../../../ts-common/database";
import { GetAllProductsQuery } from "./sql";

const router = express.Router();

router.get("/", async (_req, res) => {
  console.log("GET /api/products called");
  try {
    const [rows] = await db.query(GetAllProductsQuery());
    res.json(rows);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
