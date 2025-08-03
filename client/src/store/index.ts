import { configureStore } from "@reduxjs/toolkit";
import productsReducer from "./products/productsSlice";
import basketReducers from "./basket/basketSlice";
import usersReducer from "./users/usersSlice";
import authReducer from "./auth/authSlice";

export const store = configureStore({
  reducer: {
    products: productsReducer,
    basket: basketReducers,
    users: usersReducer,
    auth: authReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
