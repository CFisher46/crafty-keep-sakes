import { Product } from '../../../../ts-common/product-types';

type MutableProductField =
  | 'product_name'
  | 'description'
  | 'price'
  | 'quantity'
  | 'on_sale'
  | 'is_live'
  | 'sale_percent';

export function buildProductV2UpdateQuery(
  updates: Partial<Product>,
  toNumber: (value: unknown, fieldName: string) => number,
  toInteger: (value: unknown, fieldName: string) => number,
  toBoolean: (value: unknown, fieldName: string) => boolean
): {
  fields: MutableProductField[];
  values: Array<string | number>;
} {
  const fields: MutableProductField[] = [];
  const values: Array<string | number> = [];

  if (updates.product_name !== undefined) {
    fields.push('product_name');
    values.push(String(updates.product_name));
  }

  if (updates.description !== undefined) {
    fields.push('description');
    values.push(String(updates.description));
  }

  if (updates.price !== undefined) {
    fields.push('price');
    values.push(toNumber(updates.price, 'price'));
  }

  if (updates.quantity !== undefined) {
    fields.push('quantity');
    values.push(toInteger(updates.quantity, 'quantity'));
  }

  if (updates.on_sale !== undefined) {
    fields.push('on_sale');
    values.push(toBoolean(updates.on_sale, 'on_sale') ? 1 : 0);
  }

  if (updates.is_live !== undefined) {
    fields.push('is_live');
    values.push(toBoolean(updates.is_live, 'is_live') ? 1 : 0);
  }

  if (updates.sale_percent !== undefined) {
    fields.push('sale_percent');
    values.push(toNumber(updates.sale_percent, 'sale_percent'));
  }

  return { fields, values };
}

export function updateProductV2Query(
  fields: MutableProductField[],
  productId: number,
  values: Array<string | number>
) {
  return {
    sql: `
      UPDATE products_v2
      SET ${fields.map((field) => `${field} = ?`).join(', ')}
      WHERE id = ?
    `,
    values: [...values, productId],
  };
}
