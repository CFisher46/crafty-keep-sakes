import { generateSortSql } from "../../../ts-common/sql-utils";
import { DefaultQueryParams } from "../../../ts-common/types";
import { SortOptions } from "../types";

export const SORT_OPTIONS: SortOptions = {
  product_name: { alias: "fp" },
  id: { alias: "fp" },
  default: {
    column: "id",
    alias: "fp"
  }
};

const splitCsv = (value?: string) =>
  String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const escapeSqlLiteral = (value: string) => value.replace(/'/g, "''");

const toBooleanSqlValue = (value: string): "TRUE" | "FALSE" | null => {
  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes", "y"].includes(normalized)) return "TRUE";
  if (["false", "0", "no", "n"].includes(normalized)) return "FALSE";

  return null;
};

const buildTextInClause = (alias: string, column: string, value?: string) => {
  const values = splitCsv(value).map((item) => `'${escapeSqlLiteral(item)}'`);
  if (!values.length) return "";

  return `${alias}.${column} IN (${values.join(", ")})`;
};

const buildSearchClause = (alias: string, column: string, value?: string) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";

  return `${alias}.${column} LIKE '%${escapeSqlLiteral(normalized)}%'`;
};

const parseNumber = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildBooleanInClause = (
  alias: string,
  column: string,
  value?: string
) => {
  const values = splitCsv(value)
    .map(toBooleanSqlValue)
    .filter((item): item is "TRUE" | "FALSE" => item !== null);

  if (!values.length) return "";

  return `${alias}.${column} IN (${values.join(", ")})`;
};

export function GetAllProductsQuery(
  queryStringParams?: DefaultQueryParams
) {
  const whereClauses: string[] = [];
  const liveOnly = queryStringParams?.is_live === "true";

  if (liveOnly) {
    whereClauses.push("p.is_live = TRUE");
  }

  const productNameClause = buildSearchClause(
    "p",
    "product_name",
    queryStringParams?.product_name ?? queryStringParams?.search
  );
  if (productNameClause) whereClauses.push(productNameClause);

  const categoryClause = buildTextInClause("p", "category", queryStringParams?.category);
  if (categoryClause) whereClauses.push(categoryClause);

  const onSaleClause = buildBooleanInClause("p", "on_sale", queryStringParams?.on_sale);
  if (onSaleClause) whereClauses.push(onSaleClause);

  const priceMin = parseNumber(queryStringParams?.price_min);
  const priceMax = parseNumber(queryStringParams?.price_max);

  if (priceMin !== null) {
    whereClauses.push(`p.price >= ${priceMin}`);
  }

  if (priceMax !== null) {
    whereClauses.push(`p.price <= ${priceMax}`);
  }

  const whereSql = `WHERE ${whereClauses.length ? whereClauses.join(" AND ") : "p.id IS NOT NULL"}`;

  const dynamicSortSql = generateSortSql(SORT_OPTIONS, queryStringParams ?? {});

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
          ${whereSql}
    ),
    ProductCount AS (
        SELECT COUNT(*) AS total_count
        FROM FilteredProducts
    ),
    OrderedProducts AS (
        SELECT *
        FROM FilteredProducts fp
        ${dynamicSortSql ? `${dynamicSortSql}` : ``}
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
