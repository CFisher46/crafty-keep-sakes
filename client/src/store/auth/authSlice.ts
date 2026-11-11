import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "../../types";

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  sessionVersion?: number;
}

const initialState: AuthState = {
  isLoggedIn: false,
  user: null,
  sessionVersion: 0,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.isLoggedIn = true;
      state.user = action.payload;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.user = null;
      state.sessionVersion = (state.sessionVersion ?? 0) + 1;
    },
    resetState(state) {
      return { ...initialState, sessionVersion: state.sessionVersion ?? 0 };
    },
    setLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.isLoggedIn = action.payload;
    }
  }
});

export const { loginSuccess, logout, setLoggedIn, resetState } =
  authSlice.actions;

export default authSlice.reducer;
