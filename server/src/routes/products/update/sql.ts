import { Product } from "./types";

export function updateProductQuery(id: string, product: Product) {
  return {
    sql: `
      UPDATE products
      SET
        category = ?,
        description = ?,
        price = ?,
        quantity = ?,
        on_sale = ?,
        product_name = ?,
        is_live = ?,
        sale_percent = ?
      WHERE id = ?
    `,
    values: [
      product.category,
      product.description,
      product.price,
      product.quantity,
      product.on_sale,
      product.product_name,
      product.is_live,
      product.sale_percent,
      id
    ]
  };
}
