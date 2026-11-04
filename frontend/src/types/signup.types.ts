export interface SignupRequest {
  storeName: string;
  ownerName: string;
  email: string;
  password: string;
  branchName: string;
}

export interface SignupResponse {
  tenantCode: string;
  storeName: string;
}
