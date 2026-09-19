/**
 * Shared validation and normalization functions used across route handlers.
 */

/**
 * Convert and validate a value to a finite number.
 */
export const toNumber = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
};

/**
 * Convert and validate a value to an integer.
 */
export const toInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
};

/**
 * Convert and validate a value to a boolean.
 * Accepts: boolean, number (0/1), string ('true', 'false', 'yes', 'no', etc.)
 */
export const toBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }

  throw new Error(`Invalid ${fieldName}`);
};

/**
 * Normalize optional text: trim or return null if empty.
 */
export const normalizeOptionalText = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
};

/**
 * Normalize required text: trim, ensure non-empty.
 */
export const normalizeText = (value: unknown, fieldName: string): string => {
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error(`${fieldName} is required and cannot be empty`);
  }
  return text;
};

/**
 * Slugify a string: lowercase, alphanumeric + hyphens, trim hyphens.
 */
export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Parse comma-separated categories into an array.
 * Returns ['Uncategorized'] if empty.
 */
export const parseCategories = (categoryValue: string): string[] => {
  const categories = categoryValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(categories));
  return unique.length ? unique : ['Uncategorized'];
};

/**
 * Validate that an email has a reasonable format.
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate a password meets minimum requirements.
 * Minimum: 8 characters, at least one uppercase, one lowercase, one number.
 */
export const validatePassword = (password: string): { valid: boolean; reason?: string } => {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number' };
  }
  return { valid: true };
};
