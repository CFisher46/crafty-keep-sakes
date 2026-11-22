import type { DeliveryTier } from '../types';

export const deliveryTiers: DeliveryTier[] = ['small', 'medium', 'large', 'largest'];

export function calculateDelivery(items: Array<{ delivery_tier?: DeliveryTier | null; quantity: number }>): number | null {
  // Keep this preview in sync with server/src/ts-common/delivery.ts, which controls checkout.
  const quantities = { small: 0, medium: 0, large: 0, largest: 0 };
  for (const item of items) {
    switch (item.delivery_tier) {
      case 'small':
      case 'medium':
      case 'large':
      case 'largest':
        quantities[item.delivery_tier] += Number(item.quantity);
        break;
      default: return null;
    }
  }

  // Products in the same original tier are counted together; promotions never cascade.
  const total = quantities.small + quantities.medium + quantities.large + quantities.largest;
  // Over 50 items or two largest shipments cost £20. Over 20 large items count as one such shipment.
  if (total > 50 || quantities.largest >= 2 || (quantities.large > 20 && quantities.largest >= 1)) return 20;
  // Over 20 medium items use the large rate; over 20 small items use the medium rate.
  if (quantities.largest > 0 || quantities.large > 0 || quantities.medium > 20) return 10;
  if (quantities.medium > 0 || quantities.small > 20) return 6;
  return quantities.small > 0 ? 4 : 0;
}
