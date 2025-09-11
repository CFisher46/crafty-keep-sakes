import { createAsyncThunk } from "@reduxjs/toolkit";
import { loginSuccess, logout, resetState } from "./authSlice";
import { fetchUserById } from "../users/usersThunks";
import { clearSelectedUser } from "../users/usersSlice";

export const checkAuth = createAsyncThunk("auth/check", async (_, thunkAPI) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/auth/me`,
      {
        credentials: "include"
      }
    );

    if (!response.ok) throw new Error("Not authenticated");

    const { user } = await response.json();

    thunkAPI.dispatch(loginSuccess(user)); // ✅ Sets both isLoggedIn + user

    if (user.id) {
      await thunkAPI.dispatch(fetchUserById(user.id));
    }
    return user;
  } catch (err) {
    thunkAPI.dispatch(logout()); // clears state
    throw err;
  }
});

export const performLogout = createAsyncThunk(
  "auth/logout",
  async (_, thunkAPI) => {
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include" // needed to send the auth cookie
      });

      thunkAPI.dispatch(logout());
      thunkAPI.dispatch(resetState());
    } catch (error) {
      console.error("Logout failed", error);
      thunkAPI.dispatch(logout()); // fallback
    }
  }
);
