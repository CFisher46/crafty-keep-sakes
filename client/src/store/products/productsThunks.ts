// src/store/products/productsThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { Product } from "../../types";

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
  async (product: Product, { rejectWithValue }) => {
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
      return data; // Expected to return { message, insertId }
    } catch (err: any) {
      return rejectWithValue(err.message || "Unexpected error");
    }
  }
);

export const updateProduct = createAsyncThunk<
  Product, // Return type on success
  { id: string; product: Partial<Product> }, // Payload: id + partial product data
  { rejectValue: string }
>("products/updateProduct", async ({ id, product }, { rejectWithValue }) => {
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
    return updatedProduct;
  } catch (err) {
    return rejectWithValue("Network error");
  }
});

export const fetchFilteredProducts = createAsyncThunk(
  "products/fetchFilteredProducts",
  async (filters: Record<string, string>, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/products/filter?${queryParams}`
      );
      if (!res.ok) throw new Error("Failed to fetch products");
      const json = await res.json();
      return json.data; // This is important: unwrap `.data`
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);
