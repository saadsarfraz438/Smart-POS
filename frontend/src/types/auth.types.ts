export type Role = 'owner' | 'admin' | 'inventory' | 'cashier' | 'online';
export type RoleTab = 'cashier' | 'inventory' | 'admin' | 'online';

export interface Cashier { id: string; username: string; displayName: string }

export interface LoginRequest {
  tenantCode: string; username: string; pinOrPassword: string; branchId: string;
  terminalId: string; deviceFingerprint: string; roleTab: RoleTab; otp?: string;
}
export interface LoginResponse {
  accessToken: string; refreshToken: string; role: Role; displayName: string; requiresOtp?: boolean;
}
export interface Session {
  accessToken: string; role: Role; displayName: string; tenantCode: string;
  offline: boolean; // offline sessions flag every invoice SYNC_PENDING: TRUE (FR-3.5)
}
export class AuthError extends Error {
  constructor(public code: string, message?: string) { super(message ?? code); }
}
