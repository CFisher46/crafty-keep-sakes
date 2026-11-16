export type DeliveryTier = 'small' | 'medium' | 'large' | 'largest';

export function parseDeliveryTier(value: unknown): DeliveryTier {
  if (value === 'small' || value === 'medium' || value === 'large' || value === 'largest') {
    return value;
  }
  throw new Error('Invalid delivery_tier');
}

export function calculateDelivery(items: Array<{ delivery_tier?: unknown; quantity: number }>): number | null {
  let fee = 0;
  let largestQuantity = 0;
  for (const item of items) {
    switch (item.delivery_tier) {
      case 'small': fee = Math.max(fee, 4); break;
      case 'medium': fee = Math.max(fee, 6); break;
      case 'large': fee = Math.max(fee, 10); break;
      case 'largest':
        fee = Math.max(fee, 10);
        largestQuantity += Number(item.quantity);
        break;
      default: return null;
    }
  }
  return largestQuantity >= 2 ? 20 : fee;
}
