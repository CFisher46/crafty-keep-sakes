import { calculateDelivery } from './delivery';
import type { DeliveryTier } from '../types';

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

const quantityCases: Array<{
  items: Array<{ delivery_tier: DeliveryTier | null; quantity: number }>;
  expected: number | null;
}> = [
  { items: [{ delivery_tier: 'small', quantity: 20 }], expected: 4 },
  { items: [{ delivery_tier: 'small', quantity: 10 }, { delivery_tier: 'small', quantity: 11 }], expected: 6 },
  { items: [{ delivery_tier: 'medium', quantity: 20 }], expected: 6 },
  { items: [{ delivery_tier: 'medium', quantity: 21 }], expected: 10 },
  { items: [{ delivery_tier: 'small', quantity: 21 }, { delivery_tier: 'medium', quantity: 20 }], expected: 6 },
  { items: [{ delivery_tier: 'large', quantity: 21 }], expected: 10 },
  { items: [{ delivery_tier: 'large', quantity: 20 }, { delivery_tier: 'largest', quantity: 1 }], expected: 10 },
  { items: [{ delivery_tier: 'large', quantity: 21 }, { delivery_tier: 'largest', quantity: 1 }], expected: 20 },
  { items: [{ delivery_tier: 'small', quantity: 20 }, { delivery_tier: 'medium', quantity: 20 }, { delivery_tier: 'large', quantity: 10 }], expected: 10 },
  { items: [{ delivery_tier: 'small', quantity: 20 }, { delivery_tier: 'medium', quantity: 20 }, { delivery_tier: 'large', quantity: 11 }], expected: 20 },
  { items: [{ delivery_tier: 'small', quantity: 50 }], expected: 6 },
  { items: [{ delivery_tier: 'small', quantity: 51 }], expected: 20 },
  { items: [{ delivery_tier: 'small', quantity: 51 }, { delivery_tier: null, quantity: 1 }], expected: null },
];

it.each(quantityCases)('applies quantity thresholds to $items', ({ items, expected }) => {
  expect(calculateDelivery(items)).toBe(expected);
});
