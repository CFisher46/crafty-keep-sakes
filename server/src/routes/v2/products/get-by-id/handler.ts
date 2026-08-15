import express, { Request, Response } from "express";
import { db } from "../../../../ts-common/database";
import { GetSpecificProductsQuery } from "../../../products/get-by-id/sql";

const router = express.Router();

router.get("/:id", async (req: Request, res: Response) => {  console.log(`GET /api/v2/products/${req.params.id}`);
  const { id } = req.params;

  try {
    const [rows] = await db.query(GetSpecificProductsQuery(id, "v2"));
    res.json(rows);
  } catch (err) {
    console.error("V2 Product By ID DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
