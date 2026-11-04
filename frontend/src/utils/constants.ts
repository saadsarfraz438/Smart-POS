import type { Role } from '../types/auth.types';

const env = import.meta.env;
export const API_URL: string = env.VITE_API_URL ?? '';
export const TERMINAL_ID: string = env.VITE_TERMINAL_ID ?? 'T-01';
export const BRANCH_ID: string = env.VITE_BRANCH_ID ?? 'BR-LAHORE-01';
export const BRANCH_NAME: string = env.VITE_BRANCH_NAME ?? 'Main Branch - Lahore';

export const ENDPOINTS = {
  tenantLookup: '/api/v1/auth/tenant-lookup',
<<<<<<< HEAD
  signup: '/api/v1/auth/signup',
=======
>>>>>>> 3ab6cd57c8f22b843ae6c3cc5f44f70f95f48954
  login: '/api/v1/auth/login',
  health: '/api/v1/health',
} as const;

export const ERR = {
  TENANT_NOT_FOUND: 'ERR_TENANT_NOT_FOUND',
  TENANT_INACTIVE: 'ERR_TENANT_INACTIVE',
  TERMINAL_LOCKED: 'ERR_TERMINAL_LOCKED',
  SHIFT_TOKEN_EXPIRED: 'ERR_SHIFT_TOKEN_EXPIRED',
  NETWORK_FALLBACK: 'ERR_NETWORK_TIMEOUT_FALLBACK',
  TAMPER: 'ERR_SECURITY_TAMPER_DETECTED',
  VAULT_EXPIRED: 'ERR_VAULT_EXPIRED',
} as const;

export const LANDING: Record<Role, string> = {
  owner: '/admin/analytics', admin: '/admin/dashboard', inventory: '/inventory/stock-in',
  cashier: '/pos/terminal', online: '/orders/fulfillment',
};

export const OFFLINE_MAX_MS = 72 * 60 * 60 * 1000; // NFR-3.1
export const POLL_MS = 30_000; // NFR-3.2
