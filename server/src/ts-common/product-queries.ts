import { generateSortSql } from './sql-utils';
import { DefaultQueryParams } from './types';
import { SortOptions, Product } from './product-types';

type ProductReadSource = 'legacy' | 'v2';

export const SORT_OPTIONS: SortOptions = {
  product_name: { alias: 'fp' },
  id: { alias: 'fp' },
  default: {
    column: 'id',
    alias: 'fp',
  },
};

const splitCsv = (value?: string) =>
  String(value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const escapeSqlLiteral = (value: string) => value.replace(/'/g, "''");

const toBooleanSqlValue = (value: string): 'TRUE' | 'FALSE' | null => {
  const normalized = value.trim().toLowerCase();

  if (['true', '1', 'yes', 'y'].includes(normalized)) return 'TRUE';
  if (['false', '0', 'no', 'n'].includes(normalized)) return 'FALSE';

  return null;
};

const buildTextInClause = (alias: string, column: string, value?: string) => {
  const values = splitCsv(value).map((item) => `'${escapeSqlLiteral(item)}'`);
  if (!values.length) return '';

  return `${alias}.${column} IN (${values.join(', ')})`;
};

const buildV2CategoryClause = (value?: string) => {
  const values = splitCsv(value).map(
    (item) => `'${escapeSqlLiteral(item.toLowerCase())}'`
  );
  if (!values.length) return '';

  return `EXISTS (
    SELECT 1
    FROM product_categories_v2 pcf
    JOIN categories_v2 cf ON cf.id = pcf.category_id
    WHERE pcf.product_id = fp.id
      AND LOWER(cf.name) IN (${values.join(', ')})
  )`;
};

const buildSearchClause = (alias: string, column: string, value?: string) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';

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
    .filter((item): item is 'TRUE' | 'FALSE' => item !== null);

  if (!values.length) return '';

  return `${alias}.${column} IN (${values.join(', ')})`;
};

export function GetAllProductsQuery(
  queryStringParams?: DefaultQueryParams,
  source: ProductReadSource = 'legacy'
) {
  const productsTable = source === 'v2' ? 'products_v2' : 'products';
  const productImagesTable =
    source === 'v2' ? 'product_images_v2' : 'product_images';

  const baseProductsSql =
    source === 'v2'
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
            p.sale_percent
        FROM ${productsTable} p
        LEFT JOIN product_categories_v2 pc ON pc.product_id = p.id
        LEFT JOIN categories_v2 c ON c.id = pc.category_id
        GROUP BY p.id, p.description, p.price, p.quantity, p.on_sale, p.product_name, p.is_live, p.sale_percent
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
            p.sale_percent
        FROM ${productsTable} p
      `;

  const whereClauses: string[] = [];
  const liveOnly = queryStringParams?.is_live === 'true';

  if (liveOnly) {
    whereClauses.push('fp.is_live = TRUE');
  }

  const productNameClause = buildSearchClause(
    'fp',
    'product_name',
    queryStringParams?.product_name ?? queryStringParams?.search
  );
  if (productNameClause) whereClauses.push(productNameClause);

  const categoryClause =
    source === 'v2'
      ? buildV2CategoryClause(queryStringParams?.category)
      : buildTextInClause('fp', 'category', queryStringParams?.category);
  if (categoryClause) whereClauses.push(categoryClause);

  const onSaleClause = buildBooleanInClause(
    'fp',
    'on_sale',
    queryStringParams?.on_sale
  );
  if (onSaleClause) whereClauses.push(onSaleClause);

  const priceMin = parseNumber(queryStringParams?.price_min);
  const priceMax = parseNumber(queryStringParams?.price_max);

  if (priceMin !== null) {
    whereClauses.push(`fp.price >= ${priceMin}`);
  }

  if (priceMax !== null) {
    whereClauses.push(`fp.price <= ${priceMax}`);
  }

  const whereSql = `WHERE ${
    whereClauses.length ? whereClauses.join(' AND ') : 'fp.id IS NOT NULL'
  }`;

  const dynamicSortSql = generateSortSql(SORT_OPTIONS, queryStringParams ?? {});

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

export function GetSpecificProductsQuery(
  id: string,
  source: ProductReadSource = 'legacy'
) {
  const escapedId = escapeSqlLiteral(id);
  const productsTable = source === 'v2' ? 'products_v2' : 'products';
  const productImagesTable =
    source === 'v2' ? 'product_images_v2' : 'product_images';

  const baseProductsSql =
    source === 'v2'
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
    source === 'v2'
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

export function createProductQuery(product: Product) {
  return {
    sql: `
      INSERT INTO products
        (id, category, description, price, quantity, on_sale, product_name, is_live, sale_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      product.sale_percent,
    ],
  };
}

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
      id,
    ],
  };
}

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
