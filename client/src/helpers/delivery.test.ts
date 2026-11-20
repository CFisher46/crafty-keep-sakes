import { calculateDelivery } from './delivery';

it('uses the largest tier and counts all largest items without charging more than twice', () => {
  expect(calculateDelivery([])).toBe(0);
  expect(calculateDelivery([{ delivery_tier: 'small', quantity: 3 }])).toBe(4);
  expect(calculateDelivery([{ delivery_tier: 'medium', quantity: 1 }, { delivery_tier: 'small', quantity: 2 }])).toBe(6);
  expect(calculateDelivery([{ delivery_tier: 'large', quantity: 1 }, { delivery_tier: 'small', quantity: 2 }])).toBe(10);
  expect(calculateDelivery([{ delivery_tier: 'largest', quantity: 1 }, { delivery_tier: 'large', quantity: 5 }])).toBe(10);
  expect(calculateDelivery([{ delivery_tier: 'largest', quantity: 2 }])).toBe(20);
  expect(calculateDelivery([{ delivery_tier: 'largest', quantity: 1 }, { delivery_tier: 'largest', quantity: 2 }])).toBe(20);
  expect(calculateDelivery([{ delivery_tier: null, quantity: 1 }])).toBeNull();
});
