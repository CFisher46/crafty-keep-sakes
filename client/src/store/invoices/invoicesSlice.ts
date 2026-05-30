import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState} from "..";
import { Invoice } from "../../types";
import {InvoiceState} from "./types";
import { fetchAllInvoices, createInvoice } from "./invoiceThunks";

const initialState: InvoiceState = {
  list: [],
  loading: false,
  error: null,
  createStatus: "idle",
  selectedInvoice: null
};  

const invoicesSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    clearSelectedInvoice: (state) => {
      state.selectedInvoice = null;
    },
    resetCreateStatus(state) {
      state.createStatus = "idle";
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllInvoices.fulfilled, (state, action: PayloadAction<Invoice[]>) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchAllInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch invoices.";
      })
      .addCase(createInvoice.pending, (state) => {
        state.createStatus = "loading";
        state.error = null;
      })
      .addCase(createInvoice.fulfilled, (state, action: PayloadAction<Invoice>) => {
        state.createStatus = "succeeded";
        state.list.push(action.payload);
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.createStatus = "failed";
        state.error = action.error.message || "Failed to create invoice.";
      });
  }
});

export const selectInvoicesById = (state: RootState, id: number) =>
  state.invoice.list.find((invoice: Invoice) => invoice.id === id);

export const selectAllInvoices = (state: RootState) => state.invoice.list;

export const selectInvoiceLoading = (state: RootState) =>
  state.invoice.loading;

export const selectInvoiceError = (state: RootState) => state.invoice.error;

export const selectInvoiceCreateStatus = (state: RootState) =>
  state.invoice.createStatus;

export const { clearSelectedInvoice, resetCreateStatus } = invoicesSlice.actions;

export default invoicesSlice.reducer;