export const RESOLVE_PRODUCT_ID_QUERY = `
  SELECT id
  FROM products_v2
  WHERE CAST(id AS CHAR) = ? OR sku = ?
  LIMIT 1
`;

export const UPSERT_CATEGORY_QUERY = `
  INSERT INTO categories_v2 (name, slug, is_active)
  VALUES (?, ?, 1)
  ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = 1
`;

export const SELECT_CATEGORY_ID_BY_SLUG_QUERY = `
  SELECT id
  FROM categories_v2
  WHERE slug = ?
  LIMIT 1
`;

export const INSERT_PRODUCT_CATEGORY_LINK_QUERY = `
  INSERT IGNORE INTO product_categories_v2 (product_id, category_id)
  VALUES (?, ?)
`;

export const DELETE_PRODUCT_CATEGORY_LINKS_QUERY = `
  DELETE FROM product_categories_v2
  WHERE product_id = ?
`;
