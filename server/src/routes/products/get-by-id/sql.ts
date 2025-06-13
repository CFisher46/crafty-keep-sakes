import { conditionIn, generateSortSql } from "../../../ts-common/sql-utils";
import { DefaultQueryParams } from "../../../ts-common/types";
import { SortOptions } from "./types";

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
        FROM products p
    ),
    OrderedProducts AS (
        SELECT
            *
        FROM FilteredProducts fp
    )
    SELECT JSON_OBJECT(
        'total_count', COALESCE(pc.total_count, 0),
        'data', IFNULL(
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', op.id,
                    'category', op.category,
                    'description', op.description,
                    'price', op.price,
                    'quantity', op.quantity,
                    'on_sale', op.on_sale,
                    'product_name', op.product_name,
                    'is_live', op.is_live,
                    'sale_percent', op.sale_percent
                )
            ),
            JSON_ARRAY()
        )
    ) AS result
    FROM ProductCount pc
    LEFT JOIN OrderedProducts op ON TRUE;
  `;

  return result;
}
