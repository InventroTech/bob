/**
 * API Response Types
 * Common types used across API services
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LinkUserUidRequest {
  uid: string;
  email: string;
}

export interface LinkUserUidResponse {
  success?: boolean;
  message?: string;
  uid?: string;
  email?: string;
  error?: string;
  code?: string;
  activated_memberships?: number;
  membership_ids?: string[];
  already_linked?: boolean;
  no_tenant_membership?: boolean;
}

