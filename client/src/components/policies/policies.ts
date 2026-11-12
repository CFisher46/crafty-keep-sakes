export interface Policy {
  title: string;
  fileName: string;
}

export const termsAndConditions: Policy = {
  title: 'Terms & Conditions',
  fileName: 'Terms and Conditions of Sale.pdf',
};

export const footerPolicies: Policy[] = [
  termsAndConditions,
  { title: 'Shipping & Delivery', fileName: 'Shipping and Delivery Policy.pdf' },
  { title: 'Data Protection', fileName: 'Data Protection Policy.pdf' },
  { title: 'Returns & Refunds', fileName: 'Returns and Refunds Policy.pdf' },
];
