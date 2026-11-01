import { ReviewInput } from '../../../ts-common/review-types';

export const REVIEW_COLUMNS = 'id, reviewer_name, source, star_count, comment, submit_date';

export const SELECT_ALL_REVIEWS_QUERY = `
  SELECT ${REVIEW_COLUMNS}
  FROM reviews_v2
  ORDER BY submit_date DESC, id DESC
`;

export const SELECT_REVIEW_BY_ID_QUERY = `
  SELECT ${REVIEW_COLUMNS}
  FROM reviews_v2
  WHERE id = ?
  LIMIT 1
`;

export const INSERT_REVIEW_QUERY = `
  INSERT INTO reviews_v2 (reviewer_name, source, submit_date, star_count, comment)
  VALUES (?, ?, ?, ?, ?)
`;

export const DELETE_REVIEW_QUERY = 'DELETE FROM reviews_v2 WHERE id = ?';

export function buildReviewUpdateQuery(updates: Partial<ReviewInput>, reviewId: number) {
  const fields = Object.keys(updates) as Array<keyof ReviewInput>;

  return {
    sql: `
      UPDATE reviews_v2
      SET ${fields.map((field) => `${field} = ?`).join(', ')}
      WHERE id = ?
    `,
    values: [...fields.map((field) => updates[field]), reviewId],
  };
}
