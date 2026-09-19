import { GetAllProductsQuery } from './product-queries';

describe('GetAllProductsQuery', () => {
  it('builds a default query with no filters (legacy source)', () => {
    const sql = GetAllProductsQuery();

    expect(sql).toContain('FROM products p');
    expect(sql).toContain("WHERE fp.id IS NOT NULL");
  });

  it('builds a query for v2 source using products_v2 table', () => {
    const sql = GetAllProductsQuery(undefined, 'v2');

    expect(sql).toContain('FROM products_v2 p');
    expect(sql).toContain('LEFT JOIN product_categories_v2 pc');
  });

  it('filters by is_live when is_live=true', () => {
    const sql = GetAllProductsQuery({ is_live: 'true' });

    expect(sql).toContain('fp.is_live = TRUE');
  });

  it('does not filter by is_live when is_live is not "true"', () => {
    const sql = GetAllProductsQuery({ is_live: 'false' });

    expect(sql).not.toContain('fp.is_live = TRUE');
  });

  it('filters by product_name search term', () => {
    const sql = GetAllProductsQuery({ product_name: 'Tea Set' });

    expect(sql).toContain("fp.product_name LIKE '%Tea Set%'");
  });

  it('filters by search alias when product_name is absent', () => {
    const sql = GetAllProductsQuery({ search: 'Mug' });

    expect(sql).toContain("fp.product_name LIKE '%Mug%'");
  });

  it('escapes single quotes in search term to prevent SQL injection', () => {
    const sql = GetAllProductsQuery({ product_name: "O'Brien" });

    expect(sql).toContain("O''Brien");
    expect(sql).not.toContain("LIKE '%O'Brien%'");
  });

  it('filters by category for legacy source using IN clause', () => {
    const sql = GetAllProductsQuery({ category: 'Mugs,Plates' }, 'legacy');

    expect(sql).toContain("fp.category IN ('Mugs', 'Plates')");
  });

  it('filters by category for v2 source using EXISTS subquery', () => {
    const sql = GetAllProductsQuery({ category: 'Mugs' }, 'v2');

    expect(sql).toContain('EXISTS (');
    expect(sql).toContain('product_categories_v2 pcf');
    expect(sql).toContain("LOWER(cf.name) IN ('mugs')");
  });

  it('filters by on_sale=true', () => {
    const sql = GetAllProductsQuery({ on_sale: 'true' });

    expect(sql).toContain('fp.on_sale IN (TRUE)');
  });

  it('filters by on_sale=false', () => {
    const sql = GetAllProductsQuery({ on_sale: 'false' });

    expect(sql).toContain('fp.on_sale IN (FALSE)');
  });

  it('ignores invalid on_sale values', () => {
    const sql = GetAllProductsQuery({ on_sale: 'maybe' });

    expect(sql).not.toContain('fp.on_sale IN');
  });

  it('filters by minimum price', () => {
    const sql = GetAllProductsQuery({ price_min: '10' });

    expect(sql).toContain('fp.price >= 10');
  });

  it('filters by maximum price', () => {
    const sql = GetAllProductsQuery({ price_max: '50' });

    expect(sql).toContain('fp.price <= 50');
  });

  it('ignores non-numeric price filters', () => {
    const sql = GetAllProductsQuery({ price_min: 'abc' });

    expect(sql).not.toContain('fp.price >=');
  });

  it('combines multiple filters with AND', () => {
    const sql = GetAllProductsQuery({
      is_live: 'true',
      product_name: 'Mug',
      price_min: '5',
      price_max: '20',
    });

    expect(sql).toContain('fp.is_live = TRUE AND');
    expect(sql).toContain("fp.product_name LIKE '%Mug%' AND");
    expect(sql).toContain('fp.price >= 5 AND');
    expect(sql).toContain('fp.price <= 20');
  });

  it('handles empty category filter gracefully', () => {
    const sql = GetAllProductsQuery({ category: '' });

    expect(sql).toContain("WHERE fp.id IS NOT NULL");
  });
});
