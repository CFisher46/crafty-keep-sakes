import { createAsyncThunk } from '@reduxjs/toolkit';
import { User } from '../../types';
import { buildApiUrl } from '../../api/apiPath';

type RawUserRecord = Partial<User> & {
  email?: string | null;
  role_code?: string | null;
};

const normalizeUserRecord = (user: RawUserRecord): User => ({
  id: String(user.id ?? ''),
  email_address: String(user.email_address ?? user.email ?? ''),
  first_name: String(user.first_name ?? ''),
  last_name: String(user.last_name ?? ''),
  address_line1: String(user.address_line1 ?? ''),
  address_line2: String(user.address_line2 ?? ''),
  address_line3: String(user.address_line3 ?? ''),
  town: String(user.town ?? ''),
  county: String(user.county ?? ''),
  postcode: String(user.postcode ?? ''),
  telephone_number: String(user.telephone_number ?? ''),
  type: String(user.type ?? user.role_code ?? 'customer'),
  status: String(user.status ?? 'active'),
  invoice_id: Number(user.invoice_id ?? 0),
  password: String(user.password ?? ''),
});

export const fetchAllUsers = createAsyncThunk('users/fetchAll', async () => {
  const res = await fetch(buildApiUrl('users'), {
    credentials: 'include',
  });
  const data = await res.json();
  const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  return Array.isArray(parsedData)
    ? parsedData.map((user) => normalizeUserRecord(user))
    : [];
});

export const fetchUserById = createAsyncThunk<User, string>(
  'users/fetchUserById',
  async (id, thunkAPI) => {
    try {
      const res = await fetch(
        buildApiUrl('users', `/${id}`),
        {
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const message = await res.text();
        return thunkAPI.rejectWithValue(`Error: ${res.status} - ${message}`);
      }

      const data = await res.json();
      return normalizeUserRecord(data);
    } catch (error) {
      console.error('Thunk error:', error);
      return thunkAPI.rejectWithValue('Network or server error');
    }
  }
);
export const updateUser = createAsyncThunk(
  'users/update',
  async (
    {
      id,
      user,
    }: { id: string; user: Partial<User>; previousUser?: User },
    { rejectWithValue }
  ) => {
    try {
      const res = await fetch(buildApiUrl('users', `/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(user),
      });

      if (!res.ok) {
        const errorData = await res.json();
        return rejectWithValue(errorData.error || 'Failed to update user');
      }

      await res.json();

      return { ...user, id };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);
export const createUser = createAsyncThunk(
  'users/create',
  async (newUser: Partial<User>, { rejectWithValue }) => {
    try {
      const res = await fetch(buildApiUrl('users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser),
      });

      if (!res.ok) {
        const errorData = await res.json();
        return rejectWithValue(errorData.error || 'Failed to create user');
      }

      const data = await res.json();

      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id: string) => {
    await fetch(buildApiUrl('users', `/${id}`), {
      method: 'DELETE',
      credentials: 'include',
    });

    return id;
  }
);

export const verifyCurrentPassword = async (
  userId: string,
  currentPassword: string
) => {
  const response = await fetch(buildApiUrl('auth', '/verify-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword }),
  });
  if (!response.ok) {
    throw new Error('Failed to verify password');
  }

  const data = await response.json();
  return data.valid;
};
