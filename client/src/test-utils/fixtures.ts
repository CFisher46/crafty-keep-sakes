import { User } from '../types';

// Common sample fixtures reused across client test files. Use `{ ...sampleX, overrideField: ... }`
// to customize a specific test's data without redefining the whole shape.

export const sampleUser: User = {
  id: '5',
  email_address: 'jane@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  telephone_number: '555-1234',
  address_line1: '1 Main St',
  address_line2: '',
  address_line3: '',
  town: 'Springfield',
  county: 'State',
  postcode: '12345',
  type: 'customer',
  status: 'active',
  password: '',
  invoice_id: 0,
};

export const sampleProduct = {
  id: '1',
  category: 'Mugs',
  description: 'A mug',
  price: 10,
  quantity: 5,
  on_sale: false,
  product_name: 'Tea Mug',
  is_live: true,
  sale_percent: 0,
  images: [],
};

export const sampleBasketItem = {
  id: '1',
  image: 'mug.jpg',
  product_name: 'Mug',
  price: 10,
  quantity: 2,
};

export const emptyProductsState = {
  list: [],
  catalogPriceMin: 0,
  catalogPriceMax: 0,
  selectedProduct: null,
  loading: false,
  error: null,
  createStatus: 'idle' as const,
};
