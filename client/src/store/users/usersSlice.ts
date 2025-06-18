import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User, UsersState } from "../../store/users/types";
import {
  fetchAllUsers,
  fetchUserById,
  createUser,
  updateUser,
  deleteUser
} from "../../store/users/usersThunks";

const initialState: UsersState = {
  list: [],
  selectedUser: null,
  loading: false,
  error: null
};

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAllUsers.fulfilled,
        (state, action: PayloadAction<User[]>) => {
          state.loading = false;
          state.list = action.payload;
        }
      )
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch users";
      })

      .addCase(
        fetchUserById.fulfilled,
        (state, action: PayloadAction<User>) => {
          state.selectedUser = action.payload;
        }
      )

      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.list.push(action.payload);
      })

      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.list.findIndex((u) => u.id === action.payload.id);
        if (index !== -1)
          state.list[index] = {
            ...state.list[index],
            ...action.payload
          };
      })

      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<string>) => {
        state.list = state.list.filter((user) => user.id !== action.payload);
      });
  }
});

export const { clearSelectedUser } = userSlice.actions;

export default userSlice.reducer;
