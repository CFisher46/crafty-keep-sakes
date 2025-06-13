import express from "express";
import { db } from "../../../ts-common/database";
import { Product } from "./types";
import { updateProductQuery } from "./sql";

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const product = req.body as Product;

  try {
    const { sql, values } = updateProductQuery(id, product);
    const [result] = await db.query(sql, values);
    res.status(200).json({
      message: "Product updated",
      affectedRows: (result as any).affectedRows
    });
  } catch (err) {
    console.error("Update Product Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
