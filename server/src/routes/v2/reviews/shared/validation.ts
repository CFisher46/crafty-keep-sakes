import { ReviewInput } from '../../../../ts-common/review-types';

export const MAX_REVIEWER_NAME_LENGTH = 100;
export const MAX_SOURCE_LENGTH = 45;
export const MAX_COMMENT_LENGTH = 2000;

const requiredText = (value: unknown, field: string, maxLength: number): string => {
  const text = String(value ?? '').trim();

  if (!text) {
    throw new Error(`Invalid ${field}: it is required`);
  }

  if (text.length > maxLength) {
    throw new Error(`Invalid ${field}: it must be ${maxLength} characters or fewer`);
  }

  return text;
};

const toStarCount = (value: unknown): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new Error('Invalid star_count: it must be a whole number from 1 to 5');
  }

  return parsed;
};

const toSubmitDate = (value: unknown): Date => {
  const dateOnly = typeof value === 'string' ? value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;

  if (dateOnly) {
    const [, year, month, day] = dateOnly.map(Number);
    const parsed = new Date(year, month - 1, day);

    if (parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
      throw new Error('Invalid submit_date');
    }

    return parsed;
  }

  const parsed = new Date(value as string | number | Date);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid submit_date');
  }

  return parsed;
};

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

export const normalizeReviewInput = (body: Partial<ReviewInput>): ReviewInput => ({
  reviewer_name: requiredText(body.reviewer_name, 'reviewer_name', MAX_REVIEWER_NAME_LENGTH),
  source: requiredText(body.source, 'source', MAX_SOURCE_LENGTH),
  comment: requiredText(body.comment, 'comment', MAX_COMMENT_LENGTH),
  star_count: toStarCount(body.star_count),
  submit_date: hasValue(body.submit_date) ? toSubmitDate(body.submit_date) : new Date(),
});

export const normalizeReviewUpdate = (body: Partial<ReviewInput>): Partial<ReviewInput> => {
  const updates: Partial<ReviewInput> = {};

  if (body.reviewer_name !== undefined) {
    updates.reviewer_name = requiredText(body.reviewer_name, 'reviewer_name', MAX_REVIEWER_NAME_LENGTH);
  }
  if (body.source !== undefined) {
    updates.source = requiredText(body.source, 'source', MAX_SOURCE_LENGTH);
  }
  if (body.comment !== undefined) {
    updates.comment = requiredText(body.comment, 'comment', MAX_COMMENT_LENGTH);
  }
  if (body.star_count !== undefined) {
    updates.star_count = toStarCount(body.star_count);
  }
  if (body.submit_date !== undefined) {
    updates.submit_date = toSubmitDate(body.submit_date);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('Invalid review: no fields to update');
  }

  return updates;
};

export const parseReviewId = (value: unknown): number => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid review id');
  }

  return id;
};
