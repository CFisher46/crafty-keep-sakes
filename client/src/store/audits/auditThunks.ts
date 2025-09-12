import { createAsyncThunk } from "@reduxjs/toolkit";
import { Audit } from "./types";

const API_URL = process.env.REACT_APP_API_URL;

export const fetchAuditLogs = createAsyncThunk("audit/fetchLogs", async () => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/audit`);
  if (!response.ok) {
    throw new Error("Failed to fetch audit logs");
  }
  const data = await response.json();
  return data;
});
