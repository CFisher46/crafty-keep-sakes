import { Invoice } from "../types";

export function createInvoiceQuery(invoice: Invoice) {
  return {
    sql: `
      INSERT INTO invoices 
        (id, product_id, sale_id, quantity, total_price, user_id, invoice_creation_date, invoice_due_date, invoice_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
        invoice.id,
        invoice.product_id,
        invoice.sale_id,
        invoice.quantity,
        invoice.total_price,
        invoice.user_id,
        invoice.invoice_creation_date,
        invoice.invoice_due_date,
        invoice.invoice_status
    ]
  };
}
