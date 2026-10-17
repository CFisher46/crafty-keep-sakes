import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import { Review } from "../../types";
import {RootState} from "..";
import {createReview, updateReview, fetchAllReviewsForAdmin, fetchReviewsById } from "./reviewThunks"

const initialState: {
  list: Review[];
  loading: boolean;
  createStatus: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
} = {
  list: [],
  loading: false,
  createStatus: "idle",
  error: null,
};

const reviewsSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {
    resetCreateStatus: (state) => {
        state.createStatus = "idle";
        state.error = null;
    }
  },

  extraReducers: (builder) => {
    builder
      .addCase(createReview.pending, (state) => {
        state.createStatus = "loading";
        state.error = null;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
      })
      .addCase(createReview.rejected, (state, action) => {
        state.createStatus = "failed";
        state.error = action.payload as string;
      })
      .addCase(fetchAllReviewsForAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllReviewsForAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchAllReviewsForAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchReviewsById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviewsById.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        const payload = action.payload;
        state.list = typeof payload === "string" ? JSON.parse(payload) : payload;
      })
      .addCase(fetchReviewsById.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to filter products";
      })
      
      .addCase(updateReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateReview.fulfilled,
        (state, action: PayloadAction<Review>) => {
          state.loading = false;
          state.error = null;

          const index = state.list.findIndex((p) => p.id === action.payload.id);
          if (index !== -1) {
            state.list[index] = action.payload;
          }

        }
      )
      .addCase(updateReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to update review";
      });
  }
});

export const selectReviewsState = (state: RootState) => state.reviews;


export default reviewsSlice.reducer;