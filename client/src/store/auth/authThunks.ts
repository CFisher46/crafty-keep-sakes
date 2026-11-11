import { createAsyncThunk } from '@reduxjs/toolkit';
import { loginSuccess, logout, resetState } from './authSlice';
import { buildApiUrl } from '../../api/apiPath';
import type { RootState } from '../index';
import type { User } from '../../types';

export const checkAuth = createAsyncThunk<User, void, { state: RootState }>(
  'auth/check',
  async (_, thunkAPI) => {
    const sessionVersion = thunkAPI.getState().auth.sessionVersion;

    try {
      const response = await fetch(buildApiUrl('auth', '/me'), {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Not authenticated');

      const { user } = await response.json();

      if (thunkAPI.getState().auth.sessionVersion === sessionVersion) {
        thunkAPI.dispatch(loginSuccess(user));
      }
      return user;
    } catch (err) {
      if (thunkAPI.getState().auth.sessionVersion === sessionVersion) {
        thunkAPI.dispatch(logout());
      }
      throw err;
    }
  }
);

export const performLogout = createAsyncThunk(
  'auth/logout',
  async (_, thunkAPI) => {
    thunkAPI.dispatch(logout());
    thunkAPI.dispatch(resetState());

    try {
      await fetch(buildApiUrl('auth', '/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed', error);
    }
  }
);
