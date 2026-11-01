import { createSlice } from '@reduxjs/toolkit';
import { Review } from '../../types';
import { fetchReviews } from './reviewThunks';

interface ReviewsState {
  items: Review[];
  loading: boolean;
  error: string | null;
}

const initialState: ReviewsState = { items: [], loading: false, error: null };

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to load reviews';
      });
  },
});

export default reviewsSlice.reducer;
