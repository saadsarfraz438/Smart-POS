import { combineReducers, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Session } from '../types/auth.types';
import { authApi } from '../services/api/authApi';
import { tenantApi } from '../services/api/tenantApi';
<<<<<<< HEAD
import { signupApi } from '../services/api/signupApi';
=======
>>>>>>> 3ab6cd57c8f22b843ae6c3cc5f44f70f95f48954

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
<<<<<<< HEAD
  [signupApi.reducerPath]: signupApi.reducer,
=======
>>>>>>> 3ab6cd57c8f22b843ae6c3cc5f44f70f95f48954
});
