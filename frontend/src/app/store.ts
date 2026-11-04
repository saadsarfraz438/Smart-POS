import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';
import { authApi } from '../services/api/authApi';
import { tenantApi } from '../services/api/tenantApi';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (g) => g().concat(authApi.middleware, tenantApi.middleware),
});
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
