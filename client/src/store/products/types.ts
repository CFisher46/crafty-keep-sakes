export interface Product {
  id: string;
  category: string;
  description: string;
  price: string;
  quantity: string;
  on_sale: string;
  product_name: string;
  is_live: string;
  sale_percent: string | null;
  images: string | null;
}

export interface ProductsState {
  list: Product[];
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
  createStatus: "idle" | "loading" | "succeeded" | "failed";
}
