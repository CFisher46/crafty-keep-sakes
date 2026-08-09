import { Product } from '../../../products/types';

export function createProductV2Query(product: Product, sku: string) {
  return {
    sql: `
      INSERT INTO products_v2
        (sku, product_name, description, price, quantity, is_live, on_sale, sale_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      sku,
      product.product_name,
      product.description,
      product.price,
      product.quantity,
      product.is_live ? 1 : 0,
      product.on_sale ? 1 : 0,
      product.sale_percent,
    ],
  };
}
