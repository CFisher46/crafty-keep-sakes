// eslint-disable-next-line @typescript-eslint/no-require-imports -- The schema runner is untyped CommonJS.
const { ensureProductReviewSchema } = require('../../scripts/apply-schema');

it('upgrades legacy ratings atomically without inventing category scores and is repeatable', async () => {
  const legacy = [
    { Field: 'star_count', Type: 'int', Null: 'NO', Default: '5' },
    { Field: 'comment', Type: 'varchar(250)' },
  ];
  const upgraded = [
    { Field: 'star_count', Type: 'decimal(3,2)', Null: 'YES', Default: null },
    ...['match_description_rating', 'quality_rating', 'value_rating'].map((Field) => ({
      Field, Type: 'tinyint unsigned', Null: 'YES', Default: null,
    })),
    { Field: 'comment', Type: 'varchar(250)' },
  ];
  const query = jest.fn()
    .mockResolvedValueOnce([legacy])
    .mockResolvedValueOnce([{}])
    .mockResolvedValueOnce([upgraded]);

  await ensureProductReviewSchema({ query });
  await ensureProductReviewSchema({ query });

  expect(query).toHaveBeenCalledTimes(3);
  expect(query.mock.calls[1][0]).toContain('ADD COLUMN match_description_rating TINYINT UNSIGNED NULL DEFAULT NULL');
  expect(query.mock.calls[1][0]).toContain('ADD COLUMN value_rating TINYINT UNSIGNED NULL DEFAULT NULL');
  expect(query.mock.calls[1][0]).toContain('MODIFY star_count DECIMAL(3,2) NULL DEFAULT NULL');
  expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
});
