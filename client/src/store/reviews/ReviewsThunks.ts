import { createAsyncThunk } from "@reduxjs/toolkit";
import { Review } from "../../types";
import { createAuditEntry } from "../audit/auditThunks";
import {buildApiUrl} from "../../api/apiPath";

const parseProductsPayload = (raw: unknown): Review[] => {
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

export const fetchProductById = createAsyncThunk<Review, string>(
  "products/fetchById",
  async (id: string) => {
    const res = await fetch(
      buildApiUrl('products', `/${id}`)
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
      const res = await fetch(buildApiUrl('about_us'), {
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