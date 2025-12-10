import { RootState } from '../index';

export const selectAuditLogs = (state: RootState) => state.audit.logs;
export const selectAuditLoading = (state: RootState) => state.audit.loading;
export const selectAuditError = (state: RootState) => state.audit.error;
