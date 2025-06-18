import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "..";
import {
  fetchAllProducts,
  fetchProductById,
  createProduct,
  updateProduct
} from "../../store/products/productsThunks";
import { Product, ProductsState } from "./types";

const initialState: ProductsState = {
  list: [],
  selectedProduct: null,
  loading: false,
  error: null,
  createStatus: "idle"
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
    resetCreateStatus(state) {
      state.createStatus = "idle";
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createProduct.pending, (state) => {
        state.createStatus = "loading";
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.createStatus = "failed";
        state.error = action.payload as string;
      })
      .addCase(fetchAllProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchAllProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateProduct.fulfilled,
        (state, action: PayloadAction<Product>) => {
          state.loading = false;
          state.error = null;

          const index = state.list.findIndex((p) => p.id === action.payload.id);
          if (index !== -1) {
            state.list[index] = action.payload;
          }

          if (state.selectedProduct?.id === action.payload.id) {
            state.selectedProduct = action.payload;
          }
        }
      )
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to update product";
      });
  }
});

export const selectAllProducts = (state: RootState) => state.products.list;
export const selectProductsLoading = (state: RootState) =>
  state.products.loading;
export const selectProductsError = (state: RootState) => state.products.error;
export const { clearSelectedProduct, resetCreateStatus } =
  productsSlice.actions;
export default productsSlice.reducer;
