import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchAuditLogs, createAuditEntry } from "./auditThunks";
import { Audit } from "../../types";

interface AuditState {
  logs: Audit[];
  loading: boolean;
  error: string | null;
}

const initialState: AuditState = {
  logs: [],
  loading: false,
  error: null
};

const auditSlice = createSlice({
  name: "audit",
  initialState,
  reducers: {
    clearAuditLogs: (state) => {
      state.logs = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action: PayloadAction<Audit[]>) => {
        state.loading = false;
        state.logs = action.payload;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch audit logs";
      })
      .addCase(createAuditEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAuditEntry.fulfilled, (state, action: PayloadAction<Audit>) => {
        state.loading = false;
        state.logs.unshift(action.payload);
      })
      .addCase(createAuditEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearAuditLogs } = auditSlice.actions;
export default auditSlice.reducer;