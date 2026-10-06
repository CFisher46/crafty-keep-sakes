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
  id: number;
  actor_user_id: number | null;
  actor_role: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  source_endpoint: string;
  old_values_json?: unknown;
  new_values_json?: unknown;
  created_at: string;
};

export const auditFilterFields = [
  'actor_user_id',
  'actor_role',
  'action_type',
  'resource_type',
  'source_endpoint',
] as const;

export type AuditFilterField = (typeof auditFilterFields)[number];
export type AuditFilterOptions = Record<AuditFilterField, string[]>;

export type DeliveryAddress = {
  address_line1: string;
  address_line2: string;
  address_line3: string;
  town: string;
  county: string;
  postcode: string;
};

export interface InvoiceOrder {
  id: number;
  user_id: number;
  order_status: string;
  grand_total: number;
  invoice_id?: number | null;
  invoice_number?: string | null;
  placed_at: string;
}

export interface InvoiceDetails {
  id: number;
  order_id: number;
  invoice_number: string;
  invoice_status: string;
  total_due: number;
  issued_at: string;
  user_id: number;
  delivery_address?: DeliveryAddress;
  tracking_info?: string;
  items?: Array<{
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}
