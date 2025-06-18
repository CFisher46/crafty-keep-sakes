import { SortOptions } from "../types";

export const SORT_OPTIONS: SortOptions = {
  product_name: { alias: "fp" },
  id: { alias: "fp" },
  default: {
    column: "id",
    alias: "fp"
  }
};

export function GetSpecificProductsQuery(id: string) {
  const result = `
    WITH FilteredProducts AS (
        SELECT
            p.id,
            p.category,
            p.description,
            p.price,
            p.quantity,
            p.on_sale,
            p.product_name,
            p.is_live,
            p.sale_percent
        FROM products p
        WHERE p.id IN ('${id}')
    ),
    ProductCount AS (
        SELECT COUNT(*) AS total_count
        FROM FilteredProducts
    ),
    OrderedProducts AS (
        SELECT *
        FROM FilteredProducts fp
    ),
    ProductsWithImages AS (
        SELECT
            op.*,
            (
              SELECT JSON_ARRAYAGG(pi.image_path)
              FROM product_images pi
              WHERE pi.product_id = op.id
            ) AS images
        FROM OrderedProducts op
    )
    SELECT JSON_OBJECT(
        'total_count', COALESCE(pc.total_count, 0),
        'data', IFNULL(
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', pwi.id,
                    'category', pwi.category,
                    'description', pwi.description,
                    'price', pwi.price,
                    'quantity', pwi.quantity,
                    'on_sale', pwi.on_sale,
                    'product_name', pwi.product_name,
                    'is_live', pwi.is_live,
                    'sale_percent', pwi.sale_percent,
                    'images', pwi.images
                )
            ),
            JSON_ARRAY()
        )
    ) AS result
    FROM ProductCount pc
    LEFT JOIN ProductsWithImages pwi ON TRUE;
  `;

  return result;
}
