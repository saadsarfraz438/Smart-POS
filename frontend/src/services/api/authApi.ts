import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { LoginRequest, LoginResponse } from '../../types/auth.types';
import { API_URL, ENDPOINTS } from '../../utils/constants';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, timeout: 8000 }),
  endpoints: (b) => ({
    login: b.mutation<LoginResponse, { body: LoginRequest; tenantToken: string }>({
      query: ({ body, tenantToken }) => ({
        url: ENDPOINTS.login, method: 'POST', body, headers: { 'X-Tenant-Context': tenantToken },
      }),
    }),
  }),
});
// Always dispatch with initiate(arg, { track: false }) so the PIN/password is never kept in the RTK Query cache (NFR-2.3).
