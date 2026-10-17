import {RootState} from "..";

export const selectReviewsState = (state: RootState) => state.reviews;
export const selectReviewsList = (state: RootState) => state.reviews.list;
export const selectReviewsLoading = (state: RootState) => state.reviews.loading;
export const selectReviewsCreateStatus = (state: RootState) => state.reviews.createStatus;
export const selectReviewsError = (state: RootState) => state.reviews.error;