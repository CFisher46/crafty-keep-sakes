import express from "express";
import { db } from "../../../ts-common/database"
import { FetchInvoicesSQL } from "../shared/sql";


const router = express.Router();

router.get('/', async (req:any, res:any) => {
    console.log("GET /api/invoices called");
    
    try {
        const sqlQuery = FetchInvoicesSQL();
    
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

export default router