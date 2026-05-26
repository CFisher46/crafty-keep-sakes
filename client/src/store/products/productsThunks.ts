// src/store/products/productsThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { Product } from "../../types";
import { createAuditEntry } from "../audits/auditThunks";

const getChangedBy = (state: any) => {
  const loggedInUser = state.auth?.user;
  return loggedInUser
    ? `${loggedInUser.last_name}, ${loggedInUser.first_name}`
    : "Unknown";
};

export const fetchProductById = createAsyncThunk<Product, string>(
  "products/fetchById",
  async (id: string) => {
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/api/products/${id}`
    );
    const raw = await res.json();
    const result = JSON.parse(raw[0].result);
    const product = JSON.parse(result.data)[0];
    return {
      ...product,
      images: product.images ? JSON.parse(product.images) : []
    };
  }
);

export const fetchAllProducts = createAsyncThunk<Product[]>(
  "products/fetchAll",
  async (_, thunkAPI) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/products?is_live=true`);
      const data = await res.json();
      if (data && data.data) {
        return JSON.parse(data.data);
      } else {
        throw new Error("Invalid API response structure");
      }
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const fetchAllProductsForAdmin = createAsyncThunk<Product[]>(
  "products/fetchAllForAdmin",
  async (_, thunkAPI) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/products`);
      const data = await res.json();
      if (data && data.data) {
        return JSON.parse(data.data);
      } else {
        throw new Error("Invalid API response structure");
      }
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const createProduct = createAsyncThunk(
  "products/createProduct",
  async (product: Product, { dispatch, rejectWithValue, getState }) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/products`, {
        method: "POST",
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
          field_changed: "product_created",
          action_type: "CREATE",
          api_source: "/products",
          changed_by: changedBy
        })
      );

      return data; // Expected to return { message, insertId }
    } catch (err: any) {
      return rejectWithValue(err.message || "Unexpected error");
    }
  }
);

export const uploadProductImages = createAsyncThunk<
  { message: string; images: string[] },
  { productId: string; files: File[] },
  { rejectValue: string }
>("products/uploadProductImages", async ({ productId, files }, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/api/products/${productId}/images/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      return rejectWithValue(errorData.error || "Failed to upload product images");
    }

    return (await res.json()) as { message: string; images: string[] };
  } catch (err: any) {
    return rejectWithValue(err.message || "Unexpected error uploading images");
  }
});

export const updateProduct = createAsyncThunk<
  Product, // Return type on success
  { id: string; product: Partial<Product>; previousProduct?: Product }, // Payload: id + partial product data
  { rejectValue: string }
>(
  "products/updateProduct",
  async ({ id, product, previousProduct }, { dispatch, rejectWithValue, getState }) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/products/${id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
      }
    );

    if (!response.ok) {
      const errorMessage = await response.text();
      return rejectWithValue(errorMessage);
    }

    const updatedProduct = await response.json();

    if (previousProduct) {
      const changedBy = getChangedBy(getState());

      Object.keys(product).forEach((key) => {
        const typedKey = key as keyof Product;
        const oldValue = previousProduct[typedKey];
        const newValue = product[typedKey];

        if (typedKey !== "images" && oldValue !== newValue) {
          dispatch(
            createAuditEntry({
              user: id,
              field_changed: typedKey,
              action_type: "UPDATE",
              api_source: `/products`,
              changed_by: changedBy
            })
          );
        }
      });
    }

    return updatedProduct;
  } catch (err) {
    return rejectWithValue("Network error");
  }
}
);

export const fetchFilteredProducts = createAsyncThunk(
  "products/fetchFilteredProducts",
  async (filters: Record<string, string>, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/products/filter?${queryParams}`,
        {
          cache: "no-store"
        }
      );
      if (!res.ok) throw new Error("Failed to fetch products");
      const json = await res.json();
      const data = json?.data;

      if (Array.isArray(data)) {
        return data;
      }

      if (typeof data === "string" && data.trim()) {
        try {
          const parsedData = JSON.parse(data);
          return Array.isArray(parsedData) ? parsedData : [];
        } catch {
          return [];
        }
      }

      return [];
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);
