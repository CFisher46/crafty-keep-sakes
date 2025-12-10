import { createAsyncThunk } from '@reduxjs/toolkit';
import { User } from '../../types';
import { createAuditEntry } from '../audits/auditThunks';

const API_URL = process.env.REACT_APP_API_URL;
// Helper to get changedBy from state
const getChangedBy = (state: any) => {
  const loggedInUser = state.auth?.user;
  return loggedInUser
    ? `${loggedInUser.last_name}, ${loggedInUser.first_name}`
    : 'Unknown';
};

export const fetchAllUsers = createAsyncThunk('users/fetchAll', async () => {
  const res = await fetch(`${API_URL}/api/users`);
  const data = await res.json();
  const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  return parsedData || [];
});

export const fetchUserById = createAsyncThunk<User, string>(
  'users/fetchUserById',
  async (id, thunkAPI) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/users/${id}`,
        {
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const message = await res.text();
        return thunkAPI.rejectWithValue(`Error: ${res.status} - ${message}`);
      }

      const data = await res.json();
      return data;
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
      previousUser,
    }: { id: string; user: Partial<User>; previousUser?: User },
    { dispatch, rejectWithValue, getState }
  ) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(user),
      });

      if (!res.ok) {
        const errorData = await res.json();
        return rejectWithValue(errorData.error || 'Failed to update user');
      }

      const data = await res.json();

      // Create audit entries for each changed field
      if (previousUser) {
        const changedBy = getChangedBy(getState());
        Object.keys(user).forEach((key) => {
          const oldValue = previousUser[key as keyof User];
          const newValue = user[key as keyof User];

          if (oldValue !== newValue && key !== 'password') {
            dispatch(
              createAuditEntry({
                user: id,
                field_changed: key,
                action_type: 'UPDATE',
                api_source: '/user/{id}',
                changed_by: changedBy,
              })
            );
          }
        });
      }

      return { ...user, id };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);
export const createUser = createAsyncThunk(
  'users/create',
  async (newUser: Partial<User>, { dispatch, rejectWithValue, getState }) => {
    try {
      const res = await fetch(`${API_URL}/api/users`, {
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

      // Log user creation
      const changedBy = getChangedBy(getState());
      dispatch(
        createAuditEntry({
          user: data.insertId.toString(),
          field_changed: 'user_created',
          action_type: 'CREATE',
          api_source: '/admin',
          changed_by: changedBy, //Temporary until this has been thought about more
        })
      );

      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id: string, { dispatch, getState }) => {
    await fetch(`${API_URL}/api/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const changedBy = getChangedBy(getState());
    // Log user deletion
    dispatch(
      createAuditEntry({
        user: id,
        field_changed: 'user_deleted',
        action_type: 'DELETE',
        api_source: '/admin',
        changed_by: changedBy,
      })
    );

    return id;
  }
);

export const verifyCurrentPassword = async (
  userId: string,
  currentPassword: string
) => {
  const response = await fetch(`${API_URL}/api/auth/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, currentPassword }),
  });
  if (!response.ok) {
    throw new Error('Failed to verify password');
  }

  const data = await response.json();
  return data.valid;
};
