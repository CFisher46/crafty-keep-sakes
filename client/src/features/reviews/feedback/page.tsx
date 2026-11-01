import { useEffect, useMemo, useState } from 'react';
import { Box, Text, TextInput } from 'grommet';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchReviews } from '../../../store/reviews/reviewThunks';
import { Review } from '../../../types';
import { ui } from '../../../helpers/theme';

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const eyebrow = {
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: ui.muted,
};

function ReviewCard({ review }: { review: Review }) {
  return (
    <Box
      gap="small"
      pad="medium"
      background="white"
      data-testid="review-card"
      style={{ border: `1px solid ${ui.line}`, borderRadius: '2px' }}
    >
      <Text aria-label={`${review.star_count} out of 5 stars`} style={{ color: ui.accent, letterSpacing: '0.2em' }}>
        {'★'.repeat(review.star_count)}
        {'☆'.repeat(Math.max(0, 5 - review.star_count))}
      </Text>
      <Text style={{ whiteSpace: 'pre-line', fontFamily: ui.serif, fontSize: '18px', lineHeight: 1.6, color: ui.ink }}>
        “{review.comment}”
      </Text>
      <Box gap="xxsmall" pad={{ top: 'small' }} style={{ borderTop: `1px solid ${ui.line}` }}>
        <Text weight="bold" size="small" color={ui.ink}>
          {review.reviewer_name}
        </Text>
        <Text size="small" color={ui.muted}>
          {formatDate(review.submit_date)} · {review.source}
        </Text>
      </Box>
    </Box>
  );
}

export default function ReviewsPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.reviews);

  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchReviews());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return items;
    return items.filter((review) => {
      const haystack = `${review.comment} ${review.reviewer_name} ${review.source}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [items, search]);

  return (
    <Box gap="medium" pad={{ bottom: 'large', horizontal: 'xsmall' }}>
      <Box gap="xsmall" pad={{ top: 'small' }} style={{ borderTop: `1px solid ${ui.line}` }}>
        <Text style={eyebrow}>Customer feedback</Text>
        <Text style={{ color: ui.muted }}>
          We value your feedback and strive to improve our services based on your input. Here's what our customers
          have had to say:
        </Text>
      </Box>

      {loading && items.length === 0 && <Text color={ui.muted}>Loading reviews…</Text>}
      {error && items.length === 0 && <Text color="status-critical">Reviews are unavailable right now.</Text>}
      {!loading && !error && items.length === 0 && <Text color={ui.muted}>No reviews to show yet.</Text>}

      {items.length > 0 && (
        <TextInput
          type="search"
          aria-label="Search reviews"
          placeholder="Search reviews by keyword, product or name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}
      {items.length > 0 && filtered.length === 0 && (
        <Text color={ui.muted}>No reviews match your search.</Text>
      )}

      <Box gap="small">
        {filtered.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </Box>
    </Box>
  );
}
