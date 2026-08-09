import { createAsyncThunk } from '@reduxjs/toolkit';
import { loginSuccess, logout, resetState } from './authSlice';
import { buildApiUrl } from '../../api/apiPath';

export const checkAuth = createAsyncThunk('auth/check', async (_, thunkAPI) => {
  try {
    const response = await fetch(buildApiUrl('auth', '/me'), {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Not authenticated');

    const { user } = await response.json();

    thunkAPI.dispatch(loginSuccess(user)); // ✅ Sets both isLoggedIn + user
    return user;
  } catch (err) {
    thunkAPI.dispatch(logout()); // clears state
    throw err;
  }
});

export const performLogout = createAsyncThunk(
  'auth/logout',
  async (_, thunkAPI) => {
    try {
      await fetch(buildApiUrl('auth', '/logout'), {
        method: 'POST',
        credentials: 'include', // needed to send the auth cookie
      });

      thunkAPI.dispatch(logout());
      thunkAPI.dispatch(resetState());
    } catch (error) {
      console.error('Logout failed', error);
      thunkAPI.dispatch(logout()); // fallback
    }
  }
);
