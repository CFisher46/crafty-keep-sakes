// src/features/products/validation.ts
import { Product } from "../../../types";

export function validateProduct(product: Partial<Product>) {
  const errors: Record<string, string> = {};

  if (!product.product_name || product.product_name.trim() === "") {
    errors.product_name = "Product name is required";
  }

  if (!product.price) {
    errors.price = "Price is required";
  } else if (isNaN(Number(product.price)) || Number(product.price) <= 0) {
    errors.price = "Price must be a positive number";
  }

  if (!product.quantity) {
    errors.quantity = "Quantity is required";
  } else if (
    !Number.isInteger(Number(product.quantity)) ||
    Number(product.quantity) < 0
  ) {
    errors.quantity = "Quantity must be a non-negative integer";
  }

  if (product.sale_percent) {
    if (
      isNaN(Number(product.sale_percent)) ||
      Number(product.sale_percent) < 0 ||
      Number(product.sale_percent) > 100
    ) {
      errors.sale_percent = "Sale percent must be between 0 and 100";
    }
  }

  // Add more validations as needed...

  return errors;
}
