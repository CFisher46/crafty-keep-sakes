import type { DeliveryTier } from '../types';

export const deliveryTiers: DeliveryTier[] = ['small', 'medium', 'large', 'largest'];

export function calculateDelivery(items: Array<{ delivery_tier?: DeliveryTier | null; quantity: number }>): number | null {
  let fee = 0;
  let largestQuantity = 0;
  for (const item of items) {
    switch (item.delivery_tier) {
      case 'small': fee = Math.max(fee, 4); break;
      case 'medium': fee = Math.max(fee, 6); break;
      case 'large': fee = Math.max(fee, 10); break;
      case 'largest':
        fee = Math.max(fee, 10);
        largestQuantity += item.quantity;
        break;
      default: return null;
    }
  }
  return largestQuantity >= 2 ? 20 : fee;
}
