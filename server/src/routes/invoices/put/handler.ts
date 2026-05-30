import express from "express";
import { db } from "../../../ts-common/database"
import { createInvoiceQuery } from "./sql";
import { ResultSetHeader } from "mysql2";
import { Invoice } from "../types";

const router = express.Router();

router.post('/', async (req:any, res:any) => {
    console.log("POST /api/invoices called");
    
    try {
       
        const sqlQuery = createInvoiceQuery(req.body as Invoice)
        const {sql, values} = sqlQuery
        const result = await db.query(sql, values) as ResultSetHeader[];
        res.json({ success: true, affectedRows: result[0].affectedRows });
      } catch (err) {
        console.error("DB Error:", err);
        res.status(500).json({ error: "Database error" });
      }

});

export default router;