import { Query } from "slonik";

export type Primative = string | number | boolean | string[];

export type SortParams = {
  sort?: string;
  sortDir?: 'asc' | 'desc';
};

export type SortOpts<T> = {
  [Property in keyof T]: { alias: string };
} & {
  default: {
    column: keyof T;
    alias: string;
  };
};

export type FilterOpts<T> = {
  [Property in keyof T]: { alias: string };
};

export type PageSizePrams = {
  page?: string;
  pageSize?: string;
};

export type SearchParams = {
  search?: string;
  searchFields?: string;
};

export type QueryPrams ={
  is_live?: string;
  on_sale?: string;
  category?: string;
}

export type DefaultQueryParams = PageSizePrams &
  QueryPrams &
  SortParams &
  SearchParams &
  object;
