export interface VaultCashier { username: string; displayName: string; pinHash: string }
export interface VaultPayload { tenantCode: string; branchId: string; lastOnlineAt: number; cashiers: VaultCashier[] }
export interface VaultRow { id: 'vault'; salt: string; iv: string; data: string; mac: string }
