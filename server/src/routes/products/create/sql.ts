import { Product } from "./types";

export function createProductQuery(product: Product) {
  return {
    sql: `
      INSERT INTO products 
        (id,category, description, price, quantity, on_sale, product_name, is_live, sale_percent)
      VALUES (?,?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      product.id,
      product.category,
      product.description,
      product.price,
      product.quantity,
      product.on_sale,
      product.product_name,
      product.is_live,
      product.sale_percent
    ]
  };
}
