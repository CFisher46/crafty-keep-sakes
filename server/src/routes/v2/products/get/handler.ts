import express from "express";
import { db } from "../../../../ts-common/database";
import { GetAllProductsQuery } from "../../../../ts-common/product-queries";
import { DefaultQueryParams } from "../../../../ts-common/types";
import { parseJsonResult } from "../../../../ts-common/parse-json-result";

const router = express.Router();

router.get("/", async (req, res) => {
  console.log("GET /api/v2/products");

  try {
    const queryStringParams = req.query as DefaultQueryParams;
    const [rows] = await db.query(GetAllProductsQuery(queryStringParams, "v2"));

    const parsedResult = parseJsonResult(
      (rows as { result: unknown }[])?.[0]?.result
    );

    res.json(parsedResult);
  } catch (err) {
    console.error("V2 Products DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
