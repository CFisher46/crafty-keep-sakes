import { RootState } from "../../store";

export const selectAllUsers = (state: RootState) => state.users.list;
export const selectSelectedUser = (state: RootState) =>
  state.users.selectedUser;
export const selectUserLoading = (state: RootState) => state.users.loading;
export const selectUserError = (state: RootState) => state.users.error;
