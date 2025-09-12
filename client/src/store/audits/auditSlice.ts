import { createSlice } from "@reduxjs/toolkit";
import { fetchAuditLogs } from "./auditThunks";

const auditSlice = createSlice({
  name: "audit",
  initialState: {
    logs: [],
    loading: false,
    error: null as string | null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        const parsedData = JSON.parse(action.payload.data);
        state.logs = parsedData;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || null;
      });
  }
});

export default auditSlice.reducer;
