import { combineReducers, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Session } from '../types/auth.types';
import { authApi } from '../services/api/authApi';
import { tenantApi } from '../services/api/tenantApi';

const authSlice = createSlice({
  name: 'auth',
  initialState: { session: null as Session | null }, // memory only: tokens never touch localStorage
  reducers: {
    setSession(s, a: PayloadAction<Session>) { s.session = a.payload; },
    clearSession(s) { s.session = null; },
  },
});
export const { setSession, clearSession } = authSlice.actions;

export const rootReducer = combineReducers({
  auth: authSlice.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [tenantApi.reducerPath]: tenantApi.reducer,
});
