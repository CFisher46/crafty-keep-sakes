import { createSlice } from '@reduxjs/toolkit';
import { VerificationResult, verifyEmail } from './verificationThunks';

interface VerificationState {
  loading: boolean;
  error: string | null;
  result: VerificationResult | null;
}

const initialState: VerificationState = { loading: false, error: null, result: null };

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
        state.result = action.payload;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to verify email';
      });
  },
});

export default verificationSlice.reducer;
