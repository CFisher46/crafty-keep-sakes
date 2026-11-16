const { ensureProductDeliverySchema } = require('../../scripts/apply-schema');

it('adds a nullable delivery tier once without changing existing products', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce([[{ Field: 'id' }]])
    .mockResolvedValueOnce([{}])
    .mockResolvedValueOnce([[{ Field: 'id' }, { Field: 'delivery_tier' }]]);
  const connection = { query };

  await ensureProductDeliverySchema(connection);
  await ensureProductDeliverySchema(connection);

  expect(query).toHaveBeenCalledTimes(3);
  expect(query.mock.calls[1][0]).toMatch(/ALTER TABLE products_v2 ADD COLUMN delivery_tier .* NULL DEFAULT NULL/);
});
