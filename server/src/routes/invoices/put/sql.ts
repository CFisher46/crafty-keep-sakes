import { Invoice } from "../types";

type InvoiceInsertInput = Omit<Invoice, "id" | "sale_id">;

export function createInvoiceBatchQuery(invoices: InvoiceInsertInput[], saleId: number) {
  return {
    sql: `
      INSERT INTO invoices 
        (product_id, sale_id, quantity, total_price, user_id, invoice_creation_date, invoice_due_date, invoice_status)
      VALUES ${invoices.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}
    `,
    values: invoices.flatMap((invoice) => [
      invoice.product_id,
      saleId,
      invoice.quantity,
      invoice.total_price,
      invoice.user_id,
      invoice.invoice_creation_date,
      invoice.invoice_due_date,
      invoice.invoice_status
    ])
  };
}
