import { configureStore } from "@reduxjs/toolkit";
import productsReducer from "./products/productsSlice";
import basketReducers from "./basket/basketSlice";
import usersReducer from "./users/usersSlice";
import authReducer from "./auth/authSlice";
import auditLogsReducer from "./audits/auditSlice";

export const store = configureStore({
  reducer: {
    products: productsReducer,
    basket: basketReducers,
    users: usersReducer,
    auth: authReducer,
    audit: auditLogsReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
