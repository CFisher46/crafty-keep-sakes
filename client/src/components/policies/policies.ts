export interface Policy {
  title: string;
  fileName: string;
}

export const termsAndConditions: Policy = {
  title: 'Terms & Conditions',
  fileName: 'terms-and-conditions.txt',
};

export const footerPolicies: Policy[] = [
  termsAndConditions,
  { title: 'Shipping & Delivery', fileName: 'shipping-and-delivery.txt' },
  { title: 'Data Protection', fileName: 'data-protection.txt' },
  { title: 'Returns & Refunds', fileName: 'returns-and-refunds.txt' },
];
