import { createAsyncThunk } from '@reduxjs/toolkit';
import { buildApiUrl } from '../../api/apiPath';

export type VerificationResult = {
  status: 'verified' | 'already_verified';
  message: string;
};

type ResendResult = { message: string };

async function postAuthRequest<T>(
  path: string,
  body: Record<string, string>
): Promise<{ data: T } | { error: string }> {
  try {
    const response = await fetch(buildApiUrl('auth', path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    } & T;

    if (!response.ok) {
      return { error: data.error || 'The request could not be completed' };
    }
    return { data };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export const verifyEmail = createAsyncThunk<
  VerificationResult,
  { token: string },
  { rejectValue: string }
>(
  'verification/verifyEmail',
  async ({ token }, { rejectWithValue }) => {
    const result = await postAuthRequest<VerificationResult>('verify-email', { token });
    if ('error' in result) return rejectWithValue(result.error);
    return result.data;
  }
);

export const resendVerificationEmail = createAsyncThunk<
  ResendResult,
  { email: string },
  { rejectValue: string }
>(
  'verification/resendEmail',
  async ({ email }, { rejectWithValue }) => {
    const result = await postAuthRequest<ResendResult>('resend-verification', { email });
    if ('error' in result) return rejectWithValue(result.error);
    return result.data;
  }
);