export type User = {
  id: string;
  email_address: string;
  first_name: string;
  last_name: string;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  town: string;
  county: string;
  postcode: string;
  telephone_number: string;
  type: string;
  status: string;
  invoice_id: number;
  password: string;
};

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
  images: string;
};

export type Audit = {
  log_ref: number;
  user: string;
  field_changed: string;
  action_type: string;
  log_dttm: Date;
  api_source: string;
  changed_by?: string;
};
