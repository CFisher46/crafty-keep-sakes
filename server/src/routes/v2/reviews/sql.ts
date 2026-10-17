
import { Review } from '../../../ts-common/review-types';

type MutableReviewField = 
| 'comment'
| 'source'
| 'submit_date'
| 'star_count';

export const INSERT_REVIEW_QUERY = `
  INSERT INTO reviews_v2 (comment, source, star_count)
  VALUES (?, ?, ?)
`;


export function createReviewV2Query(review: Review) {
    return {
        sql: `
      INSERT INTO reviews_v2 (comment, source, submit_date, star_count)
  VALUES (?, ?, ?, ?)
    `,
        values: [
            review.comment,
            review.source,
            review.submit_date,
            review.star_count
        ],
    };
}

export function updateReviewV2Query(
  fields: MutableReviewField[],
  reviewId: number,
  values: Array<string | number>
) {
  return {
    sql: `
      UPDATE reviews_v2
      SET ${fields.map((field) => `${field} = ?`).join(', ')}
      WHERE id = ?
    `,
    values: [...values, reviewId],
  };
}