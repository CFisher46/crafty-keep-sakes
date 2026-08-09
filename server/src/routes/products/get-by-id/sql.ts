import { SortOptions } from "../types";

type ProductReadSource = "legacy" | "v2";

export const SORT_OPTIONS: SortOptions = {
  product_name: { alias: "fp" },
  id: { alias: "fp" },
  default: {
    column: "id",
    alias: "fp"
  }
};

const escapeSqlLiteral = (value: string) => value.replace(/'/g, "''");

export function GetSpecificProductsQuery(
  id: string,
  source: ProductReadSource = "legacy"
) {
  const escapedId = escapeSqlLiteral(id);
  const productsTable = source === "v2" ? "products_v2" : "products";
  const productImagesTable =
    source === "v2" ? "product_images_v2" : "product_images";

  const baseProductsSql =
    source === "v2"
      ? `
        SELECT
            p.id,
            COALESCE(GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', '), '') AS category,
            p.description,
            p.price,
            p.quantity,
            p.on_sale,
            p.product_name,
            p.is_live,
            p.sale_percent,
            p.sku
        FROM ${productsTable} p
        LEFT JOIN product_categories_v2 pc ON pc.product_id = p.id
        LEFT JOIN categories_v2 c ON c.id = pc.category_id
        GROUP BY p.id, p.description, p.price, p.quantity, p.on_sale, p.product_name, p.is_live, p.sale_percent, p.sku
      `
      : `
        SELECT
            p.id,
            p.category,
            p.description,
            p.price,
            p.quantity,
            p.on_sale,
            p.product_name,
            p.is_live,
            p.sale_percent,
            CAST(p.id AS CHAR) AS sku
        FROM ${productsTable} p
      `;

  const lookupPredicate =
    source === "v2"
      ? `CAST(fp.id AS CHAR) = '${escapedId}' OR fp.sku = '${escapedId}'`
      : `CAST(fp.id AS CHAR) = '${escapedId}'`;

  const result = `
    WITH BaseProducts AS (
        ${baseProductsSql}
    ),
    FilteredProducts AS (
        SELECT
            fp.id,
            fp.category,
            fp.description,
            fp.price,
            fp.quantity,
            fp.on_sale,
            fp.product_name,
            fp.is_live,
            fp.sale_percent
        FROM BaseProducts fp
        WHERE ${lookupPredicate}
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
              FROM ${productImagesTable} pi
              WHERE pi.product_id = op.id
            ) AS images
        FROM OrderedProducts op
    )
    SELECT JSON_OBJECT(
        'total_count', COALESCE(pc.total_count, 0),
        'data', COALESCE(
          (
            SELECT CAST(
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
                  'images', CAST(COALESCE(pwi.images, JSON_ARRAY()) AS CHAR)
                )
              ) AS CHAR
            )
            FROM ProductsWithImages pwi
          ),
          '[]'
        )
    ) AS result
    FROM ProductCount pc;
  `;

  return result;
}
