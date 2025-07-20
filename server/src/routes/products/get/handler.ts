import express from "express";
import { db } from "../../../ts-common/database";
import { GetAllProductsQuery } from "./sql";

const router = express.Router();

router.get("/", async (req, res) => {
  console.log("GET /api/products/filter called");
  try {
    const queryParams = req.query;
    const sqlQuery = GetAllProductsQuery(queryParams);

    const [rows] = await db.query(sqlQuery);
    const parsedResult = JSON.parse(
      (rows as { result: string }[])?.[0]?.result || "{}"
    );

    res.json(parsedResult);
  } catch (err) {
    console.error("Filter DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
