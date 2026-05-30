    import { RootState } from "..";
    import { Invoice } from "../../types";

    export const selectInvoicesById = (state: RootState, id: number) =>
      state.invoice.list.find((invoice: Invoice) => invoice.id === id);

    export const selectAllInvoices = (state: RootState) => state.invoice.list;

    export const selectInvoiceLoading = (state: RootState) =>
      state.invoice.loading;

    export const selectInvoiceError = (state: RootState) => state.invoice.error;

    export const selectInvoiceCreateStatus = (state: RootState) =>
      state.invoice.createStatus;

