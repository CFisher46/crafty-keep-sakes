import express from "express";
import { db } from "../../../ts-common/database";
import { GetAllProductsQuery } from "./sql";

const router = express.Router();

// filepath: /Users/chrisfisher/Desktop/crafty-keep-sakes/server/src/routes/products/get/handler.ts
router.get("/", async (_req, res) => {
  console.log("GET /api/products called");
  try {
    const [rows] = await db.query(GetAllProductsQuery());
    const parsedResult = JSON.parse((rows as any)?.[0]?.result || "{}");
    res.json(parsedResult);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
