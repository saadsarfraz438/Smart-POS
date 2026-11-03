import axios from 'axios';
import { getRoleFromPath, getStoredSession } from '../lib/auth.ts';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5298/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const pathName = typeof window !== 'undefined' ? window.location.pathname : '';
  const scope = getRoleFromPath(pathName) || undefined;
  const session = getStoredSession(scope);
  if (session?.token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

export const login = (payload) => api.post('/auth/login', payload);
export const getCurrentUser = () => api.get('/auth/me');

export const getProducts = () => api.get('/products');
export const createProduct = (payload) => api.post('/products', payload);
export const updateProduct = (id, payload) => api.put(`/products/${id}`, payload);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

export const getSalespersons = () => api.get('/salespersons');
export const createSalesperson = (payload) => api.post('/salespersons', payload);
export const updateSalesperson = (id, payload) => api.put(`/salespersons/${id}`, payload);
export const deleteSalesperson = (id) => api.delete(`/salespersons/${id}`);

export const getSales = () => api.get('/sales');
export const createSale = (payload) => api.post('/sales', payload);
export const deleteSale = (id) => api.delete(`/sales/${id}`);

export default api;
