import { SortOpts } from "../../../ts-common/types";

export type Product = {
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
export type SortOptions = SortOpts<SortParams>;
