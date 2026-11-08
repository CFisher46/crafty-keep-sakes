import { createSlice } from '@reduxjs/toolkit';
import { Verification } from '../../types';
import {verifyEmail} from './verificationThunks';

interface VerificationState {
  items: Verification[];
  loading: boolean;
  error: string | null;
}

const initialState: VerificationState = { items: [], loading: false, error: null };

const verificationSlice = createSlice({
  name: 'verification',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(verifyEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to verify email';
      });
  },
});

export default verificationSlice.reducer;
