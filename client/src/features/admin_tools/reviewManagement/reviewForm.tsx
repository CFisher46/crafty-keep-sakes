import { useState } from 'react';
import { Box, Text, TextInput, TextArea, Select } from 'grommet';
import ActionButton from '../../landingPage/components/ActionButton';
import { ReviewInput } from '../../../types';

export const emptyReview = (): ReviewInput => ({
  reviewer_name: '',
  source: '',
  star_count: 5,
  comment: '',
  submit_date: new Date().toISOString().slice(0, 10),
});

interface ReviewFormProps {
  initial: ReviewInput;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (review: ReviewInput) => void;
}

const labelStyle = { fontSize: '12px', fontWeight: 700 } as const;

export default function ReviewForm({ initial, submitLabel, submitting, onSubmit }: ReviewFormProps) {
  const [review, setReview] = useState<ReviewInput>(initial);
  const [showErrors, setShowErrors] = useState(false);

  const errors: string[] = [];
  if (!review.reviewer_name.trim()) errors.push('Reviewer name is required');
  if (!review.source.trim()) errors.push('Source is required');
  if (!review.comment.trim()) errors.push('Comment is required');
  if (!review.submit_date) errors.push('Date is required');

  const handleSubmit = () => {
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    onSubmit({
      ...review,
      reviewer_name: review.reviewer_name.trim(),
      source: review.source.trim(),
      comment: review.comment.trim(),
    });
  };

  return (
    <Box gap="small" pad="small" width="large">
      <Box gap="xxsmall">
        <Text style={labelStyle}>Reviewer name</Text>
        <TextInput
          aria-label="Reviewer name"
          maxLength={100}
          value={review.reviewer_name}
          onChange={(e) => setReview({ ...review, reviewer_name: e.target.value })}
        />
      </Box>
      <Box gap="xxsmall">
        <Text style={labelStyle}>Source (e.g. Facebook, Google)</Text>
        <TextInput
          aria-label="Source"
          maxLength={45}
          value={review.source}
          onChange={(e) => setReview({ ...review, source: e.target.value })}
        />
      </Box>
      <Box direction="row" gap="medium" wrap>
        <Box gap="xxsmall" width="small">
          <Text style={labelStyle}>Stars</Text>
          <Select
            aria-label="Stars"
            options={[1, 2, 3, 4, 5]}
            value={review.star_count}
            onChange={({ option }) => setReview({ ...review, star_count: option })}
          />
        </Box>
        <Box gap="xxsmall" width="small">
          <Text style={labelStyle}>Date</Text>
          <TextInput
            aria-label="Date"
            type="date"
            value={review.submit_date}
            onChange={(e) => setReview({ ...review, submit_date: e.target.value })}
          />
        </Box>
      </Box>
      <Box gap="xxsmall">
        <Text style={labelStyle}>Comment</Text>
        <TextArea
          aria-label="Comment"
          rows={6}
          maxLength={2000}
          value={review.comment}
          onChange={(e) => setReview({ ...review, comment: e.target.value })}
        />
      </Box>
      {showErrors && errors.length > 0 && (
        <Box role="alert">
          {errors.map((message) => (
            <Text key={message} color="status-critical" size="small">
              {message}
            </Text>
          ))}
        </Box>
      )}
      <Box direction="row">
        <ActionButton label={submitLabel} onClick={handleSubmit} disabled={submitting} fixed />
      </Box>
    </Box>
  );
}
