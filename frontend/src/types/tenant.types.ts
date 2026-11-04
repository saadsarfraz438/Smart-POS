import type { Cashier } from './auth.types';

export interface TenantContext {
  tenantContextToken: string; // transient, signed (FR-1.3). Never a connection string (NFR-2.1)
  tenantName: string;
  branchId: string;
  branchName: string;
  cashiers: Cashier[]; // active cashiers for this branch (FR-2.2)
}
