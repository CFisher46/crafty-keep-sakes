import { Invoice } from "../../types";
export interface InvoiceState {
  list: Invoice[];
  loading: boolean;
  error: string | null;
  createStatus: "idle" | "loading" | "succeeded" | "failed";
  selectedInvoice: Invoice | null;
}
