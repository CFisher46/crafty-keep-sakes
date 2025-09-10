import { createAsyncThunk } from "@reduxjs/toolkit";
import { User } from "../../store/users/types";

const API_URL = process.env.REACT_APP_API_URL;

export const fetchAllUsers = createAsyncThunk("users/fetchAll", async () => {
  const res = await fetch(`${API_URL}/api/users`);
  const data = await res.json();
  const parsedData =
    typeof data.data === "string" ? JSON.parse(data.data) : data.data;

  return parsedData || [];
});

export const fetchUserById = createAsyncThunk<User, string>(
  "users/fetchUserById",
  async (id, thunkAPI) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/users/${id}`,
        {
          credentials: "include"
        }
      );

      if (!res.ok) {
        const message = await res.text();
        return thunkAPI.rejectWithValue(`Error: ${res.status} - ${message}`);
      }

      const data = await res.json();
      console.log("API Response for fetchUserById:", data); // Debugging log
      return data; // Return the root object directly
    } catch (error) {
      console.error("Thunk error:", error);
      return thunkAPI.rejectWithValue("Network or server error");
    }
  }
);

export const createUser = createAsyncThunk(
  "users/create",
  async (newUser: Partial<User>) => {
    const res = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser)
    });
    const data = await res.json();
    return data;
  }
);

export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, user }: { id: string; user: Partial<User> }) => {
    const res = await fetch(`${API_URL}/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });
    const data = await res.json();
    return { ...user, id }; // optionally, merge response if backend returns full object
  }
);

export const deleteUser = createAsyncThunk(
  "users/delete",
  async (id: string) => {
    await fetch(`${API_URL}/api/users/${id}`, {
      method: "DELETE"
    });
    return id;
  }
);

export const verifyCurrentPassword = async (
  userId: string,
  currentPassword: string
) => {
  const response = await fetch(`${API_URL}/api/auth/verify-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, currentPassword })
  });
  console.log("User ID provided for verification:", userId);
  if (!response.ok) {
    throw new Error("Failed to verify password");
  }

  const data = await response.json();
  return data.valid;
};
