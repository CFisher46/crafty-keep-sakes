import { createAsyncThunk } from "@reduxjs/toolkit";
import { Review } from "../../types";
import { createAuditEntry } from "../audits/auditThunks"; 
import {buildApiUrl} from "../../api/apiPath";

const parseReviewsPayload = (raw: unknown): Review[] => {
  const normalizeArray = (input: unknown[]): Review[] => {
    if (!input.length) {
      return [];
    }

    if (typeof input[0] === "string") {
      return input
        .map((item) => {
          if (typeof item !== "string") {
            return null;
          }

          try {
            return JSON.parse(item);
          } catch {
            return null;
          }
        })
        .filter((item): item is Review => Boolean(item));
    }

    return input as Review[];
  };

  if (Array.isArray(raw)) {
    return normalizeArray(raw);
  }

  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? normalizeArray(parsed) : [];
    } catch {
      return [];
    }
  }

  return [];
};

const getChangedBy = (state: any) => {
  const loggedInUser = state.auth?.user;
  return loggedInUser
    ? `${loggedInUser.last_name}, ${loggedInUser.first_name}`
    : "Unknown";
};

export const fetchReviewsById = createAsyncThunk<Review, string>(
  "reviews/fetchById",
  async (id: string) => {
    const res = await fetch(
      buildApiUrl('reviews', `/${id}`)
    );
    const raw = await res.json();
    const result = JSON.parse(raw[0].result);
    const review = JSON.parse(result.data)[0];
    return review;
  }
);

export const createReview = createAsyncThunk(
  "reviews/createReview",
  async (product: Review, { dispatch, rejectWithValue, getState }) => {
    try {
      const res = await fetch(buildApiUrl('reviews'), {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(product)
      });

      if (!res.ok) {
        const errorData = await res.json();
        return rejectWithValue(errorData.error || "Failed to create product");
      }

      const data = await res.json();

      const changedBy = getChangedBy(getState());
      dispatch(
        createAuditEntry({
          user: String(product.id || data.insertId || ""),
          field_changed: "review_created",
          action_type: "CREATE",
          api_source: "/reviews",
          changed_by: changedBy
        })
      );

      return data; 
    } catch (err: any) {
      return rejectWithValue(err.message || "Unexpected error");
    }
  }
);

export const updateReview = createAsyncThunk<
  Review, 
  { id: string; review: Partial<Review>; previousReview?: Review }, 
  { rejectValue: string }
>(
  "reviews/updateReview",
  async ({ id, review, previousReview }, { dispatch, rejectWithValue, getState }) => {
  try {
    const response = await fetch(
      buildApiUrl('reviews', `/${id}`),
      {
        method: "PUT",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review)
      }
    );

    if (!response.ok) {
      const errorMessage = await response.text();
      return rejectWithValue(errorMessage);
    }

    const updatedReview = await response.json();

    if (previousReview) {
      const changedBy = getChangedBy(getState());

      Object.keys(review).forEach((key) => {
        const typedKey = key as keyof Review;
        const oldValue = previousReview[typedKey];
        const newValue = review[typedKey];

        if (oldValue !== newValue) {
          dispatch(
            createAuditEntry({
              user: id,
              field_changed: typedKey,
              action_type: "UPDATE",
              api_source: `/reviews`,
              changed_by: changedBy
            })
          );
        }
      });
    }

    return updatedReview;
  } catch (err) {
    return rejectWithValue("Network error");
  }
}
);

export const fetchAllReviewsForAdmin = createAsyncThunk<Review[]>(
  "reviews/fetchAllForAdmin",
  async (_, thunkAPI) => {
    try {
      const res = await fetch(buildApiUrl('reviews'));
      const data = await res.json();
      if (data && data.data !== undefined) {
        return parseReviewsPayload(data.data);
      } else {
        throw new Error("Invalid API response structure");
      }
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);