import { useEffect, useState } from 'react';
import { Box, Layer, Select, Text } from 'grommet';
import { buildApiUrl } from '../../../api/apiPath';
import ActionButton from '../../landingPage/components/ActionButton';

type ProductReview = {
  id: string;
  product_id: string;
  product_name: string;
  comment: string;
  submit_date: string;
};

const endpoint = '/products/admin/reviews';
const describe = (review: ProductReview) =>
  `${review.product_name} · ${review.submit_date} · #${review.id}`;

export default function ProductReviewManagement() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [selected, setSelected] = useState<ProductReview | undefined>();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(buildApiUrl('reviews', endpoint), { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load product reviews.');
        const body = await response.json();
        if (!Array.isArray(body?.data)) throw new Error('Could not load product reviews.');
        if (active) setReviews(body.data);
      })
      .catch(() => {
        if (active) setMessage({ text: 'Could not load product reviews.', error: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const deleteReview = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(buildApiUrl('reviews', `${endpoint}/${selected.id}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Could not delete the product review.');
      setReviews((current) => current.filter((review) => review.id !== selected.id));
      setSelected(undefined);
      setConfirming(false);
      setMessage({ text: 'Product review deleted.', error: false });
    } catch {
      setMessage({ text: 'Could not delete the product review.', error: true });
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box gap="small" pad="small">
      <Box gap="xsmall" width="large">
        <Text size="small">Select a product review to delete</Text>
        <Select
          aria-label="Select a product review"
          options={reviews}
          labelKey={describe}
          valueKey="id"
          value={selected}
          placeholder={loading ? 'Loading product reviews' : 'Select a product review'}
          onChange={({ option }) => { setSelected(option); setMessage(null); }}
        />
      </Box>
      {message && (
        <Text role={message.error ? 'alert' : 'status'} color={message.error ? 'status-critical' : 'status-ok'}>
          {message.text}
        </Text>
      )}
      {!loading && !message?.error && reviews.length === 0 && <Text>No product reviews yet.</Text>}
      {selected && (
        <Box gap="small" pad="small" background="light-2" round="small" width="large">
          <Text weight="bold">{describe(selected)}</Text>
          <Text>{selected.comment}</Text>
          <Box direction="row">
            <ActionButton label="Delete product review" onClick={() => setConfirming(true)} fixed />
          </Box>
        </Box>
      )}
      {confirming && selected && (
        <Layer onEsc={() => !submitting && setConfirming(false)} onClickOutside={() => !submitting && setConfirming(false)}>
          <Box pad="medium" gap="small" width="medium">
            <Text weight="bold" color="status-critical">Confirm delete</Text>
            <Text>{`Permanently delete this review of ${selected.product_name}? This cannot be undone.`}</Text>
            <Box direction="row" gap="small" justify="end">
              <ActionButton secondary label="Cancel" onClick={() => setConfirming(false)} disabled={submitting} fixed />
              <ActionButton label={submitting ? 'Deleting…' : 'Confirm Delete'} onClick={deleteReview} disabled={submitting} fixed />
            </Box>
          </Box>
        </Layer>
      )}
    </Box>
  );
}
