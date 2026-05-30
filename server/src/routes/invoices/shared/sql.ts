import { DefaultQueryParams } from "../../../ts-common/types"

function FetchInvoicesSQL(queryParams?: DefaultQueryParams){
    return `
        WITH FilteredInvoices AS (
            SELECT
                i.id,
                i.product_id,
                p.product_name,
                p.price AS product_price,
                i.sale_id,
                i.quantity,
                i.total_price,
                i.user_id,
                i.invoice_creation_date,
                i.invoice_due_date,
                i.invoice_status
            FROM invoices i
            LEFT JOIN products p ON i.product_id = p.id
            WHERE 1=1
            ${queryParams?.invoice_id ? `AND i.id = ${queryParams.invoice_id}` : ``}
        ),
        InvoiceCount AS (
            SELECT COUNT(*) AS total_count
            FROM FilteredInvoices
        )
        SELECT JSON_OBJECT(
            'total_count', COALESCE(ic.total_count, 0),
            'data', IFNULL(
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', fi.id,
                        'product_id', fi.product_id,
                        'product_name', fi.product_name,
                        'product_price', fi.product_price,
                        'sale_id', fi.sale_id,
                        'quantity', fi.quantity,
                        'total_price', fi.total_price,
                        'user_id', fi.user_id,
                        'invoice_creation_date', fi.invoice_creation_date,
                        'invoice_due_date', fi.invoice_due_date,
                        'invoice_status', fi.invoice_status
                    )
                ),
                JSON_ARRAY()
            )
        ) AS result
        FROM InvoiceCount ic
        LEFT JOIN FilteredInvoices fi ON TRUE;
    `;
}

export { FetchInvoicesSQL }