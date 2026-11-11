export const MAX_QUANTITY = 2147483647;

export const parseQuantity = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= MAX_QUANTITY
    ? quantity
    : null;
};
