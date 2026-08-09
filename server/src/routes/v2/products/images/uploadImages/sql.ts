export const SELECT_PRODUCT_IMAGE_MAX_SORT_QUERY = `
  SELECT COALESCE(MAX(sort_order), -1) AS max_sort
  FROM product_images_v2
  WHERE product_id = ?
`;

export const INSERT_PRODUCT_IMAGE_V2_QUERY = `
  INSERT INTO product_images_v2 (product_id, image_path, sort_order, is_primary)
  VALUES (?, ?, ?, ?)
`;
