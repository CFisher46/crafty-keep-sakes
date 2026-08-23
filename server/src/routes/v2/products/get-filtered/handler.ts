import express from "express";
import { db } from "../../../../ts-common/database";
import { GetAllProductsQuery } from "../../../../ts-common/product-queries";
import { DefaultQueryParams } from "../../../../ts-common/types";

const router = express.Router();

router.get("/filter", async (req, res) => {
  console.log("GET /api/v2/products/filter");

  try {
    const queryStringParams = req.query as DefaultQueryParams;

    const [rows] = await db.query(GetAllProductsQuery(queryStringParams, "v2"));

    const parsedResult = JSON.parse(
      (rows as { result: string }[])?.[0]?.result || "{}"
    );

    if (Array.isArray(parsedResult?.data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsedResult.data = parsedResult.data.map((product: any) => {
        if (typeof product.images === "string") {
          try {
            product.images = JSON.parse(product.images);
          } catch (err) {
            console.warn("Failed to parse v2 product.images", err);
            product.images = [];
          }
        }
        return product;
      });
    }

    res.json(parsedResult);
  } catch (err) {
    console.error("V2 Filter DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
