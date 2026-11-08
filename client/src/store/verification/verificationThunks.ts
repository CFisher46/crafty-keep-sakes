import { createAsyncThunk } from '@reduxjs/toolkit';
import { Verification } from '../../types';
import { buildApiUrl } from '../../api/apiPath';

export const verifyEmail = createAsyncThunk<Verification, { token: string }>(
    '/verifyEmail',

    async ({ token }: { token: string }, { rejectWithValue }) => {
        console.log('Verifying email with token:', token);
        console.log('API URL:', buildApiUrl('auth', 'verify-email'));

        try {
            const res = await fetch(buildApiUrl('auth', 'verify-email'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                return rejectWithValue(errorData.error || 'Failed to verify email');
            }

            const data = await res.json();
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Network error');
        }
    }
);