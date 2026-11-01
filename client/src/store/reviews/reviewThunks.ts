import { createAsyncThunk } from '@reduxjs/toolkit';
import { Review, ReviewInput } from '../../types';
import { buildApiUrl } from '../../api/apiPath';

const readError = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = await response.json();
    return body?.error || body?.message || fallback;
  } catch {
    return fallback;
  }
};

export const fetchReviews = createAsyncThunk<Review[], void, { rejectValue: string }>(
  'reviews/fetchReviews',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('reviews', '/'));
      if (!response.ok) {
        return rejectWithValue(await readError(response, 'Failed to load reviews'));
      }
      const body = await response.json();
      return Array.isArray(body?.data) ? (body.data as Review[]) : [];
    } catch {
      return rejectWithValue('Failed to load reviews');
    }
  }
);

export const createReview = createAsyncThunk<void, ReviewInput, { rejectValue: string }>(
  'reviews/createReview',
  async (review, { dispatch, rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('reviews', '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(review),
      });
      if (!response.ok) {
        return rejectWithValue(await readError(response, 'Failed to create review'));
      }
      await dispatch(fetchReviews());
    } catch {
      return rejectWithValue('Failed to create review');
    }
  }
);

export const updateReview = createAsyncThunk<
  void,
  { id: number; changes: Partial<ReviewInput> },
  { rejectValue: string }
>('reviews/updateReview', async ({ id, changes }, { dispatch, rejectWithValue }) => {
  try {
    const response = await fetch(buildApiUrl('reviews', `/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(changes),
    });
    if (!response.ok) {
      return rejectWithValue(await readError(response, 'Failed to update review'));
    }
    await dispatch(fetchReviews());
  } catch {
    return rejectWithValue('Failed to update review');
  }
});

export const deleteReview = createAsyncThunk<void, number, { rejectValue: string }>(
  'reviews/deleteReview',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const response = await fetch(buildApiUrl('reviews', `/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        return rejectWithValue(await readError(response, 'Failed to delete review'));
      }
      await dispatch(fetchReviews());
    } catch {
      return rejectWithValue('Failed to delete review');
    }
  }
);
