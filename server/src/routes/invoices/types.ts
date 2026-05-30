
export type Invoice = {
    id: number;
    product_id: number;
    sale_id: number;
    quantity: number;
    total_price: number;
    user_id: number;
    invoice_creation_date: string;
    invoice_due_date: string;
    invoice_status: "Paid" | "Unpaid" | "Overdue";
}