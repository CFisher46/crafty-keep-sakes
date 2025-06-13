import { DefaultQueryParams, Primative, SortOpts } from "./types";

export const conditionIn = (
  alias: string,
  column: string,
  value: Primative
) => {
  const values = Array.isArray(value)
    ? value
    : (value as string).split(",").map((v) => v.trim());
  let dynamicValueList;
  for (value of values) {
    dynamicValueList = !dynamicValueList ? `?` : `${dynamicValueList}, ?`;
  }
  if (!dynamicValueList) return undefined;
  return `${alias}.${column} IN (${dynamicValueList})`;
};

export function generateSortSql<T>(
  opts: SortOpts<T>,
  queryStringParams: DefaultQueryParams
) {
  let alias, column;
  const { sort, sortDir } = queryStringParams || {};
  if (!sort || !opts[sort as keyof T]) {
    alias = opts.default.alias;
    column = opts.default.column as string;
  } else {
    alias = opts[sort as keyof T].alias;
    column = sort as string;
  }
  const direction = sortDir === "desc" ? "DESC" : "ASC";

  return `ORDER BY ${alias}.${column} ${direction}`;
}

export function generateFilterSql<T>(
  opts: { [Property in keyof T]: { alias: string } },
  queryStringParams: DefaultQueryParams
) {
  const filters = Object.entries(queryStringParams)
    .filter(([key]) => opts[key as keyof T])
    .map(([key, value]) => {
      const { alias } = opts[key as keyof T];
      return conditionIn(alias, key, value);
    })
    .filter(Boolean);

  return filters.length > 0 ? `${filters.join(" AND ")}` : "";
}
