import { calculateDelivery } from './delivery';

describe('delivery charges', () => {
  it.each([
    [[], 0],
    [[{ delivery_tier: 'small', quantity: 3 }], 4],
    [[{ delivery_tier: 'medium', quantity: 1 }, { delivery_tier: 'small', quantity: 2 }], 6],
    [[{ delivery_tier: 'large', quantity: 1 }, { delivery_tier: 'small', quantity: 2 }], 10],
    [[{ delivery_tier: 'largest', quantity: 1 }, { delivery_tier: 'large', quantity: 5 }], 10],
    [[{ delivery_tier: 'largest', quantity: 2 }], 20],
    [[{ delivery_tier: 'largest', quantity: 1 }, { delivery_tier: 'largest', quantity: 1 }], 20],
    [[{ delivery_tier: 'largest', quantity: 3 }], 20],
    [[{ delivery_tier: null, quantity: 1 }], null],
    [[{ delivery_tier: 'small', quantity: 1 }, { delivery_tier: 'unknown', quantity: 1 }], null],
  ])('calculates delivery for %j', (items, expected) => {
    expect(calculateDelivery(items)).toBe(expected);
  });
});
