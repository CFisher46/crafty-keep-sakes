import express from "express";
import { db } from "../../../ts-common/database"
import { createInvoiceBatchQuery } from "./sql";
import { ResultSetHeader } from "mysql2";
import { Invoice } from "../types";

const router = express.Router();

type InvoiceInsertInput = Omit<Invoice, "id" | "sale_id">;

router.post('/', async (req:any, res:any) => {
    console.log("POST /api/invoices called");

    const invoiceItems = Array.isArray(req.body?.items) ? req.body.items : [];

    if (invoiceItems.length === 0) {
      return res.status(400).json({ error: "At least one invoice item is required" });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [saleRows] = await connection.query(
          "SELECT sale_id FROM invoices ORDER BY sale_id DESC LIMIT 1 FOR UPDATE"
        );

        const lastSaleId = Number((saleRows as { sale_id?: number }[])?.[0]?.sale_id ?? 0);
        const saleId = lastSaleId + 1;

        const sanitizedItems: InvoiceInsertInput[] = invoiceItems.map((item: any) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          total_price: Number(item.total_price),
          user_id: Number(item.user_id),
          invoice_creation_date: String(item.invoice_creation_date),
          invoice_due_date: String(item.invoice_due_date),
          invoice_status: item.invoice_status
        }));

        const sqlQuery = createInvoiceBatchQuery(sanitizedItems, saleId);
        const {sql, values} = sqlQuery;
        const [result] = await connection.query<ResultSetHeader>(sql, values);

        await connection.commit();

        res.json({ success: true, affectedRows: result.affectedRows, sale_id: saleId });
      } catch (err) {
        console.error("DB Error:", err);
        await connection.rollback();
        res.status(500).json({ error: "Database error" });
      } finally {
        connection.release();
      }

});

export default router;