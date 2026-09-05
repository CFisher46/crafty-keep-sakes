import { conditionIn, generateSortSql, generateFilterSql } from './sql-utils';
import { SORT_OPTIONS } from './product-queries';

describe('sql-utils', () => {
  describe('conditionIn', () => {
    it('builds an IN clause placeholder for comma-separated string values', () => {
      const result = conditionIn('fp', 'category', 'Mugs,Plates');

      expect(result).toBe('fp.category IN (?, ?)');
    });

    it('builds an IN clause placeholder for a single value', () => {
      const result = conditionIn('fp', 'category', 'Mugs');

      expect(result).toBe('fp.category IN (?)');
    });

    it('builds an IN clause placeholder for array values', () => {
      const result = conditionIn('fp', 'category', ['Mugs', 'Plates']);

      expect(result).toBe('fp.category IN (?, ?)');
    });

    it('builds a single placeholder for an empty string value', () => {
      const result = conditionIn('fp', 'category', '');

      expect(result).toBe('fp.category IN (?)');
    });
  });

  describe('generateSortSql', () => {
    const opts = SORT_OPTIONS;

    it('sorts by default column and ASC direction when no sort param given', () => {
      const result = generateSortSql(opts, {});

      expect(result).toBe('ORDER BY fp.id ASC');
    });

    it('sorts by requested column when valid', () => {
      const result = generateSortSql(opts, { sort: 'product_name' });

      expect(result).toBe('ORDER BY fp.product_name ASC');
    });

    it('sorts descending when sortDir is desc', () => {
      const result = generateSortSql(opts, { sort: 'product_name', sortDir: 'desc' });

      expect(result).toBe('ORDER BY fp.product_name DESC');
    });

    it('falls back to default column when an invalid sort key is given', () => {
      const result = generateSortSql(opts, { sort: 'nonexistent_column' });

      expect(result).toBe('ORDER BY fp.id ASC');
    });

    it('sorts ascending for any sortDir value other than desc', () => {
      const result = generateSortSql(opts, { sort: 'id', sortDir: 'asc' });

      expect(result).toBe('ORDER BY fp.id ASC');
    });
  });

  describe('generateFilterSql', () => {
    const opts = {
      category: { alias: 'fp' },
      on_sale: { alias: 'fp' },
    };

    it('returns an empty string when no matching filters are provided', () => {
      const result = generateFilterSql(opts, {});

      expect(result).toBe('');
    });

    it('builds a filter clause for a single matching param', () => {
      const result = generateFilterSql(opts, { category: 'Mugs' });

      expect(result).toBe('fp.category IN (?)');
    });

    it('combines multiple filter clauses with AND', () => {
      const result = generateFilterSql(opts, { category: 'Mugs', on_sale: 'true' });

      expect(result).toBe('fp.category IN (?) AND fp.on_sale IN (?)');
    });

    it('ignores query params that are not in the opts map', () => {
      const result = generateFilterSql(opts, { unrelated_param: 'value' } as any);

      expect(result).toBe('');
    });
  });
});
