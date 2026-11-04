import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { TenantContext } from '../../types/tenant.types';
import { API_URL, ENDPOINTS } from '../../utils/constants';

export const tenantApi = createApi({
  reducerPath: 'tenantApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, timeout: 8000 }),
  endpoints: (b) => ({
    tenantLookup: b.mutation<TenantContext, { TenantCode: string }>({
      query: (body) => ({ url: ENDPOINTS.tenantLookup, method: 'POST', body }),
    }),
  }),
});
