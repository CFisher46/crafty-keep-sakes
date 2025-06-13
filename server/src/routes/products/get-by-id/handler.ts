import express from "express";
import { db } from "../../../ts-common/database";
import { GetSpecificProductsQuery } from "./sql";

const router = express.Router();

router.get("/:id", async (req: any, res: any) => {
  const id = req.params.id;
  console.log(`GET /api/products/${id} called`);
  try {
    const [rows] = await db.query(GetSpecificProductsQuery(id));
    const result = JSON.parse((rows as any)[0]?.result || "{}");

    if (!result.data || result.data.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
