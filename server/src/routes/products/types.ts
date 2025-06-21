import { SortOpts, FilterOpts } from "../../ts-common/types";

export type Product = {
  id: string;
  category: string;
  description: string;
  price: number;
  quantity: number;
  on_sale: boolean;
  product_name: string;
  is_live: boolean;
  sale_percent: number;
};

interface SortParams {
  id: string;
  product_name: string;
}
interface FilterParams {
  is_live: boolean;
  on_sale: boolean;
  category: string;
}
export type SortOptions = SortOpts<SortParams>;
export type FilterOptions = FilterOpts<FilterParams>;
