import express from "express";
import { db } from "../../../ts-common/database";
import { Audit } from "../types";
import { addNewLog } from "./sql";
import { ResultSetHeader } from "mysql2";

const router = express.Router();

router.post("/", async (req, res) => {
  console.log("POST /api/audit/add called");
  const audit = req.body as Audit;

  try {
    const { sql, values } = addNewLog(audit);
    const [result] = await db.query<ResultSetHeader>(sql, values);
    res.status(201).json({
      message: "Audit log created",
      insertId: result.insertId
    });
  } catch (err) {
    console.error("Create Audit Log Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
