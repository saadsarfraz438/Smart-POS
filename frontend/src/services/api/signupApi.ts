import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { SignupRequest, SignupResponse } from '../../types/signup.types';
import { API_URL, ENDPOINTS } from '../../utils/constants';

export const signupApi = createApi({
  reducerPath: 'signupApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, timeout: 180000 }),
  endpoints: (b) => ({
    signup: b.mutation<SignupResponse, SignupRequest>({
      query: (body) => ({ url: ENDPOINTS.signup, method: 'POST', body }),
    }),
  }),
});
