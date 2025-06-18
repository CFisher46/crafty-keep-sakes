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

export const fetchUserById = createAsyncThunk(
  "users/fetchById",
  async (id: string) => {
    const res = await fetch(`${API_URL}/api/users/${id}`);
    const data = await res.json();
    const parsedResult = JSON.parse(data[0].result);
    const user = JSON.parse(parsedResult.data)[0];

    return user as User;
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
