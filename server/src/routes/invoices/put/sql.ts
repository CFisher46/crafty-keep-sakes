import { Invoice } from "../types";

export function createInvoiceQuery(invoice: Invoice) {
  return {
    sql: `
      INSERT INTO invoices 
        (id,product_id, sale_id, quantity, total_price)
      VALUES (?,?,?,?,?)
    `,
    values: [
        invoice.id,
        invoice.product_id,
        invoice.sale_id,
        invoice.quantity,
        invoice.total_price
    ]
  };
}
