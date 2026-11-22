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

  it.each([
    [[{ delivery_tier: 'small', quantity: 20 }], 4],
    [[{ delivery_tier: 'small', quantity: 10 }, { delivery_tier: 'small', quantity: 11 }], 6],
    [[{ delivery_tier: 'medium', quantity: 20 }], 6],
    [[{ delivery_tier: 'medium', quantity: 21 }], 10],
    [[{ delivery_tier: 'small', quantity: 21 }, { delivery_tier: 'medium', quantity: 20 }], 6],
    [[{ delivery_tier: 'large', quantity: 21 }], 10],
    [[{ delivery_tier: 'large', quantity: 20 }, { delivery_tier: 'largest', quantity: 1 }], 10],
    [[{ delivery_tier: 'large', quantity: 21 }, { delivery_tier: 'largest', quantity: 1 }], 20],
    [[{ delivery_tier: 'small', quantity: 20 }, { delivery_tier: 'medium', quantity: 20 }, { delivery_tier: 'large', quantity: 10 }], 10],
    [[{ delivery_tier: 'small', quantity: 20 }, { delivery_tier: 'medium', quantity: 20 }, { delivery_tier: 'large', quantity: 11 }], 20],
    [[{ delivery_tier: 'small', quantity: 50 }], 6],
    [[{ delivery_tier: 'small', quantity: 51 }], 20],
    [[{ delivery_tier: 'small', quantity: 51 }, { delivery_tier: null, quantity: 1 }], null],
  ])('applies quantity thresholds to %j', (items, expected) => {
    expect(calculateDelivery(items)).toBe(expected);
  });
});
