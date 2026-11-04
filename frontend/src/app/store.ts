import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';
import { authApi } from '../services/api/authApi';
import { tenantApi } from '../services/api/tenantApi';
<<<<<<< HEAD
import { signupApi } from '../services/api/signupApi';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (g) => g().concat(authApi.middleware, tenantApi.middleware, signupApi.middleware),
=======

export const store = configureStore({
  reducer: rootReducer,
  middleware: (g) => g().concat(authApi.middleware, tenantApi.middleware),
>>>>>>> 3ab6cd57c8f22b843ae6c3cc5f44f70f95f48954
});
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
