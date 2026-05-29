/**
 * API Module Index
 * Central export point for all API-related functionality
 */

// Client
export { apiClient, createApiClient, apiFetch } from './client';

// Configuration
export { API_CONFIG, getBaseUrl, getTenantSlug } from './config';

// Errors
export {
  ApiError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from './errors';

// Interceptors (exported for advanced usage)
export { setupRequestInterceptor, setupResponseInterceptor } from './interceptors';

// Types
export type {
  ApiResponse,
  PaginatedResponse,
  LinkUserUidRequest,
  LinkUserUidResponse,
} from './types';

// Services
export { authService, linkUserUidLegacy } from './services/auth';
export { billingService } from './services/billing';
export { membershipService } from './services/membership';
export { pageService } from './services/pageService';
export type {
  BillingMember,
  BillingReport,
  BillingReportParams,
  BillingRole,
  BillingSummary,
} from './services/billing';
export type {
  Role,
  User,
  AssignmentUser,
  HierarchyUser,
  HierarchyAssignment,
} from './services/membership';

