import { createAsyncThunk } from "@reduxjs/toolkit";
import { Invoice } from "../../types";

export const fetchAllInvoices = createAsyncThunk(
  "invoices/fetchAll",
  async (_, thunkAPI) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/invoices`);
      const data = await res.json();
      if (data && data.data) {
        return JSON.parse(data.data);
      } else {
        throw new Error("Invalid API response structure");
      }
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const createInvoice = createAsyncThunk(
  "invoices/createInvoice",
  async (invoice: Invoice, { dispatch, rejectWithValue, getState }) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(invoice)
      });
      if (!res.ok) {
        throw new Error(`Failed to create invoice: ${res.statusText}`);
      }
      const data = await res.json();
      if (data && data.data) {
        return JSON.parse(data.data);
      } else {
        throw new Error("Invalid API response structure");
      }
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);