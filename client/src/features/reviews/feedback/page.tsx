import { useEffect } from 'react';
import { Box, Text } from 'grommet';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchReviews } from '../../../store/reviews/reviewThunks';
import { Review } from '../../../types';

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

function ReviewCard({ review }: { review: Review }) {
  return (
    <Box pad="small" background="light-2" round="small" gap="small" data-testid="review-card">
      <Text aria-label={`${review.star_count} out of 5 stars`}>
        {'★'.repeat(review.star_count)}
        {'☆'.repeat(Math.max(0, 5 - review.star_count))}
      </Text>
      <Text style={{ whiteSpace: 'pre-line' }}>“{review.comment}”</Text>
      <Text size="small" weight="bold">
        {review.reviewer_name}
      </Text>
      <Text size="small">
        {formatDate(review.submit_date)} · {review.source}
      </Text>
    </Box>
  );
}

export default function ReviewsPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.reviews);

  useEffect(() => {
    dispatch(fetchReviews());
  }, [dispatch]);

  return (
    <Box pad="medium" gap="small">
      <Text>Customer Feedback</Text>
      <Text>We value your feedback and strive to improve our services based on your input.</Text>
      <Text>Here's what our customers have had to say:</Text>

      {loading && items.length === 0 && <Text>Loading reviews…</Text>}
      {error && items.length === 0 && <Text color="status-critical">Reviews are unavailable right now.</Text>}
      {!loading && !error && items.length === 0 && <Text>No reviews to show yet.</Text>}
      {items.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </Box>
  );
}
