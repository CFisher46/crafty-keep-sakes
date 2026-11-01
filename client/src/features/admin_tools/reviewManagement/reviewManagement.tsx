import { useEffect, useState } from 'react';
import { Box, Layer, Select, Text } from 'grommet';
import ActionButton from '../../landingPage/components/ActionButton';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { createReview, deleteReview, fetchReviews, updateReview } from '../../../store/reviews/reviewThunks';
import { Review, ReviewInput } from '../../../types';
import ReviewForm, { emptyReview } from './reviewForm';

type ReviewAction = 'Add' | 'Update' | 'Delete';

const describe = (review: Review) => `${review.submit_date} – ${review.reviewer_name} (${review.source})`;

export default function ReviewManagement({ action }: { action: ReviewAction }) {
  const dispatch = useAppDispatch();
  const reviews = useAppSelector((state) => state.reviews.items);
  const [selected, setSelected] = useState<Review | undefined>();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    dispatch(fetchReviews());
  }, [dispatch]);

  useEffect(() => {
    setSelected(undefined);
    setMessage(null);
    setConfirmingDelete(false);
  }, [action]);

  const finish = (
    result: { meta: { requestStatus: string }; payload?: unknown },
    success: string,
    onSuccess?: () => void
  ) => {
    setSubmitting(false);
    if (result.meta.requestStatus === 'fulfilled') {
      setMessage({ text: success, error: false });
      onSuccess?.();
    } else {
      setMessage({ text: String(result.payload ?? 'Something went wrong'), error: true });
    }
  };

  const handleCreate = async (review: ReviewInput) => {
    setSubmitting(true);
    const result = await dispatch(createReview(review));
    finish(result, 'Review added.', () => setFormKey((key) => key + 1));
  };

  const handleUpdate = async (review: ReviewInput) => {
    if (!selected) return;
    setSubmitting(true);
    const result = await dispatch(updateReview({ id: selected.id, changes: review }));
    finish(result, 'Review updated.');
  };

  const handleDelete = async () => {
    if (!selected) return;
    setConfirmingDelete(false);
    const result = await dispatch(deleteReview(selected.id));
    finish(result, 'Review deleted.', () => setSelected(undefined));
  };

  const picker = action !== 'Add' && (
    <Box gap="xsmall" width="large">
      <Text size="small">{`Select a review to ${action.toLowerCase()}`}</Text>
      <Select
        aria-label="Select a review"
        options={reviews}
        labelKey={describe}
        valueKey="id"
        value={selected}
        placeholder={reviews.length ? 'Select a review' : 'No reviews yet'}
        onChange={({ option }) => {
          setSelected(option);
          setMessage(null);
        }}
      />
    </Box>
  );

  return (
    <Box gap="small" pad="small">
      {picker}

      {message && (
        <Text role={message.error ? 'alert' : 'status'} color={message.error ? 'status-critical' : 'status-ok'}>
          {message.text}
        </Text>
      )}

      {action === 'Add' && (
        <ReviewForm
          key={formKey}
          initial={emptyReview()}
          submitLabel="Add review"
          submitting={submitting}
          onSubmit={handleCreate}
        />
      )}

      {action === 'Update' && selected && (
        <ReviewForm
          key={selected.id}
          initial={{
            reviewer_name: selected.reviewer_name,
            source: selected.source,
            star_count: selected.star_count,
            comment: selected.comment,
            submit_date: selected.submit_date,
          }}
          submitLabel="Save changes"
          submitting={submitting}
          onSubmit={handleUpdate}
        />
      )}

      {action === 'Delete' && selected && (
        <Box gap="small" pad="small" background="light-2" round="small" width="large">
          <Text weight="bold">{'★'.repeat(selected.star_count)}</Text>
          <Text>{selected.comment}</Text>
          <Text size="small">{describe(selected)}</Text>
          <Box direction="row">
            <ActionButton label="Delete review" onClick={() => setConfirmingDelete(true)} fixed />
          </Box>
        </Box>
      )}

      {confirmingDelete && selected && (
        <Layer onEsc={() => setConfirmingDelete(false)} onClickOutside={() => setConfirmingDelete(false)}>
          <Box pad="medium" gap="small" width="medium">
            <Text weight="bold" color="status-critical">
              Confirm delete
            </Text>
            <Text>{`Permanently delete the review from ${selected.reviewer_name}? This cannot be undone.`}</Text>
            <Box direction="row" gap="small" justify="end">
              <ActionButton secondary label="Cancel" onClick={() => setConfirmingDelete(false)} fixed />
              <ActionButton label="Confirm Delete" onClick={handleDelete} fixed />
            </Box>
          </Box>
        </Layer>
      )}
    </Box>
  );
}
