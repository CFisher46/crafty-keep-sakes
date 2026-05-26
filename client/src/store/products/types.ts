import { Product } from "../../types";

export interface ProductsState {
  list: Product[];
  catalogPriceMin: number;
  catalogPriceMax: number;
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
  createStatus: "idle" | "loading" | "succeeded" | "failed";
}
