import express, { Request, Response } from "express";
import { db } from "../../../ts-common/database";
import { GetSpecificProductsQuery } from "./sql";

const router = express.Router();

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(GetSpecificProductsQuery(id));
    res.json(rows);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
