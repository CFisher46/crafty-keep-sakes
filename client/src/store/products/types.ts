import { Product } from "../../types";

export interface ProductsState {
  list: Product[];
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
  createStatus: "idle" | "loading" | "succeeded" | "failed";
}
