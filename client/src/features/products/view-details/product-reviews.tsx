import { FormEvent, useEffect, useState } from 'react';
import { Box, Button, Layer, Text, TextArea } from 'grommet';
import { buildApiUrl } from '../../../api/apiPath';
import { ui } from '../../../helpers/theme';

type ProductReview = {
  id: number;
  reviewer_name: string;
  star_count: number;
  match_description_rating: number;
  quality_rating: number;
  value_rating: number;
  comment: string;
  submit_date: string;
};

type ReviewRatings = Pick<
  ProductReview,
  'match_description_rating' | 'quality_rating' | 'value_rating'
>;

type Eligibility = {
  eligible: boolean;
  has_review: boolean;
  has_recent_purchase: boolean;
};

const RATING_FIELDS: Array<{ key: keyof ReviewRatings; label: string }> = [
  { key: 'match_description_rating', label: 'Matches Description' },
  { key: 'quality_rating', label: 'Quality' },
  { key: 'value_rating', label: 'Value' },
];

const COMMENT_MAX_LENGTH = 250;

const readError = async (
  response: Response,
  fallback: string
): Promise<string> => {
  try {
    const body = await response.json();
    return body?.error || body?.message || fallback;
  } catch {
    return fallback;
  }
};

const fetchProductReviews = async (
  productId: string
): Promise<ProductReview[]> => {
  const response = await fetch(
    buildApiUrl('reviews', `/products/${productId}/reviews`),
    {
      credentials: 'include',
    }
  );
  if (!response.ok) {
    throw new Error(
      await readError(response, 'Could not load product reviews')
    );
  }
  const body = await response.json();
  return Array.isArray(body?.data) ? body.data : [];
};

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<ReviewRatings>({
    match_description_rating: 5,
    quality_rating: 5,
    value_rating: 5,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReviews([]);
    setReviewsError(null);
    setEligibility(null);
    setEligibilityError(null);
    setRatings({
      match_description_rating: 5,
      quality_rating: 5,
      value_rating: 5,
    });
    setComment('');
    setSubmitError(null);
    setSubmitMessage(null);

    fetchProductReviews(productId)
      .then((items) => {
        if (active) setReviews(items);
      })
      .catch((error: unknown) => {
        if (active)
          setReviewsError(
            error instanceof Error
              ? error.message
              : 'Could not load product reviews'
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    fetch(buildApiUrl('reviews', `/products/${productId}/eligibility`), {
      credentials: 'include',
    })
      .then(async (response) => {
        if (response.status === 401) {
          return;
        }
        if (!response.ok) {
          throw new Error(
            await readError(response, 'Could not check review eligibility')
          );
        }
        const body = (await response.json()) as Eligibility;
        if (active) setEligibility(body);
      })
      .catch((error: unknown) => {
        if (active) {
          setEligibilityError(
            error instanceof Error
              ? error.message
              : 'Could not check review eligibility'
          );
        }
      });

    return () => {
      active = false;
    };
  }, [productId]);

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      const response = await fetch(
        buildApiUrl('reviews', `/products/${productId}/reviews`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...ratings, comment }),
        }
      );
      if (!response.ok) {
        throw new Error(
          await readError(response, 'Could not submit your review')
        );
      }

      setComment('');
      setEligibility({
        eligible: false,
        has_review: true,
        has_recent_purchase: true,
      });
      setSubmitMessage('Thank you for sharing your review.');
      setReviewFormOpen(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not submit your review'
      );
    } finally {
      setSubmitting(false);
    }

    try {
      setReviews(await fetchProductReviews(productId));
      setReviewsError(null);
    } catch (error) {
      setReviewsError(
        error instanceof Error
          ? error.message
          : 'Could not load product reviews'
      );
    }
  };

  const averageFor = (key: keyof ReviewRatings) =>
    reviews.length > 0
      ? (
          reviews.reduce((total, review) => total + review[key], 0) /
          reviews.length
        ).toFixed(1)
      : null;
  const averageRating =
    averageFor('match_description_rating') === null
      ? null
      : (
          reviews.reduce(
            (total, review) =>
              total +
              review.match_description_rating +
              review.quality_rating +
              review.value_rating,
            0
          ) /
          (reviews.length * RATING_FIELDS.length)
        ).toFixed(1);
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 2);
  const reviewsContentId = `product-reviews-content-${productId}`;

  const toggleReviews = () => {
    if (reviewsExpanded) setReviewFormOpen(false);
    setReviewsExpanded(!reviewsExpanded);
  };

  return (
    <Box
      as="section"
      gap="small"
      margin={{ top: 'large', horizontal: 'medium', bottom: 'medium' }}
      pad="medium"
      background={ui.page}
      style={{ borderTop: `1px solid ${ui.line}`, borderRadius: '2px' }}
      aria-labelledby="product-reviews-heading"
    >
      <Button
        plain
        type="button"
        aria-label={
          reviewsExpanded ? 'Hide product reviews' : 'Show product reviews'
        }
        aria-expanded={reviewsExpanded}
        aria-controls={reviewsContentId}
        onClick={toggleReviews}
        style={{ width: '100%', padding: 0, textAlign: 'left' }}
      >
        <Box direction="row" wrap align="center" justify="between" gap="small">
          <Box gap="xxsmall">
            <Text
              id="product-reviews-heading"
              style={{
                fontSize: '11px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: ui.muted,
              }}
            >
              Customer reviews
            </Text>
            <Text
              style={{ fontFamily: ui.serif, fontSize: '23px', color: ui.ink }}
            >
              Reviews
            </Text>
          </Box>
          <Box direction="row" align="center" gap="small" wrap>
            {reviews.length > 0 && (
              <>
                <Text
                  aria-label={`${averageRating} average rating out of 5`}
                  style={{ color: ui.accent, letterSpacing: '0.12em' }}
                >
                  {'★'.repeat(Math.round(Number(averageRating)))}
                  {'☆'.repeat(5 - Math.round(Number(averageRating)))}
                </Text>
                <Text size="small" weight="bold" color={ui.ink}>
                  {averageRating} / 5
                </Text>
              </>
            )}
            <Text size="small" color={ui.muted}>
              {loading
                ? 'Loading reviews…'
                : reviewsError
                  ? 'Reviews unavailable'
                  : `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`}
            </Text>
            <Text size="small" color={ui.ink}>
              {reviewsExpanded ? 'Hide reviews' : 'View reviews'}
            </Text>
          </Box>
        </Box>
      </Button>

      <Box
        id={reviewsContentId}
        gap="small"
        style={{ display: reviewsExpanded ? 'flex' : 'none' }}
      >
        {reviews.length > 0 && (
          <Box direction="row" wrap gap="xsmall">
            {RATING_FIELDS.map(({ key, label }) => (
              <Box
                key={key}
                direction="row"
                align="center"
                gap="xsmall"
                pad={{ horizontal: 'small', vertical: 'xsmall' }}
                background={ui.sand}
                style={{ borderRadius: '2px' }}
              >
                <Text size="xsmall" color={ui.muted}>
                  {label}
                </Text>
                <Text size="xsmall" weight="bold" color={ui.ink}>
                  {averageFor(key)}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {loading && <Text color={ui.muted}>Loading reviews…</Text>}
        {reviewsError && (
          <Text role="alert" color="status-critical">
            {reviewsError}
          </Text>
        )}
        {!loading && !reviewsError && reviews.length === 0 && (
          <Text color={ui.muted}>Be the first to review this product.</Text>
        )}
        <Box
          style={{
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {visibleReviews.map((review) => {
            const visibleStars = Math.round(review.star_count);
            return (
              <Box
                key={review.id}
                gap="xsmall"
                pad="small"
                background="white"
                style={{ border: `1px solid ${ui.line}`, borderRadius: '2px' }}
                data-testid="product-review-card"
              >
                <Text
                  aria-label={`${review.star_count.toFixed(2)} average out of 5`}
                  style={{ color: ui.accent, letterSpacing: '0.15em' }}
                >
                  {'★'.repeat(visibleStars)}
                  {'☆'.repeat(Math.max(0, 5 - visibleStars))}
                  {` ${review.star_count.toFixed(2)}`}
                </Text>
                <Text size="small" color={ui.muted}>
                  {RATING_FIELDS.map(
                    ({ key, label }) => `${label}: ${review[key]}/5`
                  ).join(' · ')}
                </Text>
                <Text
                  style={{
                    whiteSpace: 'pre-line',
                    lineHeight: 1.5,
                    color: ui.ink,
                  }}
                >
                  {review.comment}
                </Text>
                <Text size="small" color={ui.muted}>
                  {review.reviewer_name} · {formatDate(review.submit_date)}
                </Text>
              </Box>
            );
          })}
        </Box>
        {reviews.length > 2 && (
          <Button
            plain
            label={
              showAllReviews
                ? 'Show fewer reviews'
                : `Show all ${reviews.length} reviews`
            }
            onClick={() => setShowAllReviews((showAll) => !showAll)}
            style={{
              alignSelf: 'flex-start',
              color: ui.ink,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          />
        )}

        {eligibilityError && (
          <Text role="alert" color="status-critical">
            {eligibilityError}
          </Text>
        )}
        {submitMessage && (
          <Text role="status" color={ui.accent}>
            {submitMessage}
          </Text>
        )}

        {eligibility?.eligible && (
          <Box direction="row" justify="end" pad={{ top: 'small' }}>
            <Button
              label="Write a review"
              onClick={() => setReviewFormOpen(true)}
            />
          </Box>
        )}

        {eligibility?.eligible && reviewFormOpen && (
          <Layer
            modal
            onEsc={() => setReviewFormOpen(false)}
            onClickOutside={() => setReviewFormOpen(false)}
          >
            <Box
              width={{ max: '560px', width: '90vw' }}
              height={{ max: '85vh' }}
              overflow="auto"
              pad="medium"
              gap="medium"
              background="white"
            >
              <Box direction="row" justify="between" align="center">
                <Text
                  weight="bold"
                  style={{ fontFamily: ui.serif, fontSize: '22px' }}
                >
                  Write a review
                </Text>
                <Button
                  plain
                  label="Close"
                  onClick={() => setReviewFormOpen(false)}
                />
              </Box>
              <form onSubmit={submitReview}>
                <Box gap="small">
                  <Box
                    style={{
                      display: 'grid',
                      gap: '12px',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(190px, 1fr))',
                    }}
                  >
                    {RATING_FIELDS.map(({ key, label }) => (
                      <Box
                        key={key}
                        gap="xsmall"
                        pad="small"
                        background={ui.page}
                        style={{
                          border: `1px solid ${ui.line}`,
                          borderRadius: '2px',
                        }}
                      >
                        <Text size="small" weight="bold">
                          {label}
                        </Text>
                        <Box direction="row" align="center" gap="xsmall">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Button
                              key={value}
                              plain
                              type="button"
                              a11yTitle={`Rate ${label} ${value} out of 5`}
                              aria-pressed={ratings[key] === value}
                              onClick={() =>
                                setRatings((current) => ({
                                  ...current,
                                  [key]: value,
                                }))
                              }
                              style={{
                                color:
                                  value <= ratings[key] ? ui.accent : ui.line,
                                fontSize: '20px',
                                padding: '2px',
                                lineHeight: 1,
                              }}
                            >
                              ★
                            </Button>
                          ))}
                        </Box>
                        <Text size="xsmall" color={ui.muted}>
                          {ratings[key]} / 5
                        </Text>
                      </Box>
                    ))}
                  </Box>
                  <TextArea
                    aria-label="Your review"
                    placeholder="Share your experience"
                    value={comment}
                    maxLength={COMMENT_MAX_LENGTH}
                    rows={3}
                    onChange={(event) => setComment(event.target.value)}
                  />
                  <Box direction="row" justify="between" align="center">
                    <Text size="xsmall" color={ui.muted}>
                      Your feedback
                    </Text>
                    <Text aria-live="polite" size="small" color={ui.muted}>
                      {comment.length} / {COMMENT_MAX_LENGTH}
                    </Text>
                  </Box>
                  {submitError && (
                    <Text role="alert" color="status-critical">
                      {submitError}
                    </Text>
                  )}
                  <Button
                    type="submit"
                    label={submitting ? 'Submitting…' : 'Submit review'}
                    disabled={submitting || !comment.trim()}
                  />
                </Box>
              </form>
            </Box>
          </Layer>
        )}
      </Box>
    </Box>
  );
}
