import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "../../types";

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  sessionVersion?: number;
  notice?: string | null;
  logoutFailed?: boolean;
}

const initialState: AuthState = {
  isLoggedIn: false,
  user: null,
  sessionVersion: 0,
  notice: null,
  logoutFailed: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.isLoggedIn = true;
      state.user = action.payload;
      state.notice = null;
      state.logoutFailed = false;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.user = null;
      state.sessionVersion = (state.sessionVersion ?? 0) + 1;
    },
    resetState(state) {
      return { ...initialState, sessionVersion: state.sessionVersion ?? 0 };
    },
    sessionEnded: (state, action: PayloadAction<string>) => {
      state.isLoggedIn = false;
      state.user = null;
      state.sessionVersion = (state.sessionVersion ?? 0) + 1;
      state.notice = action.payload;
      state.logoutFailed = false;
    },
    logoutError: (state) => {
      state.notice = "Sign out could not be completed. Your sessions may still be active. Please try again.";
      state.logoutFailed = true;
    },
    setLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.isLoggedIn = action.payload;
    }
  }
});

export const { loginSuccess, logout, setLoggedIn, resetState, sessionEnded, logoutError } =
  authSlice.actions;

export default authSlice.reducer;
