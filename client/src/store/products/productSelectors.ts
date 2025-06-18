import { RootState } from "../../store";

export const selectAllProducts = (state: RootState) => state.products.list;

export const selectSelectedProduct = (state: RootState) =>
  state.products.selectedProduct;

export const selectProductLoading = (state: RootState) =>
  state.products.loading;

export const selectProductError = (state: RootState) => state.products.error;

export const selectProductCreateStatus = (state: RootState) =>
  state.products.createStatus;

export const selectProductById = (state: RootState, id: string) =>
  state.products.list.find((product) => product.id === id);

export const selectUpdateError = (state: RootState) => state.products.error;
