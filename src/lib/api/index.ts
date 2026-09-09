/**
 * API Module Index
 * Central export point for all API-related functionality
 */

// Client
export { apiClient, createApiClient, apiFetch } from './client';

// Configuration
export { API_CONFIG, getBaseUrl, getTenantSlug } from './config';

// React Query keys
export { queryKeys } from './queryKeys';

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
export { chatbotService } from './services/chatbot';
export type {
  ChatAskPayload,
  ChatAskResponse,
  ChatMessage,
  ChatSource,
} from './services/chatbot';
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
export {
  backgroundJobsService,
  enqueueBackgroundJob,
  enqueueCseAssignedJob,
  enqueueSaveSupportTicketJob,
  getBackgroundJobStatus,
  getJobPayloadTemplate,
  listRunnableJobTypes,
  rerunBackgroundJob,
} from './services/backgroundJobs';
export type {
  BackgroundJobDetail,
  ManualJobRunResult,
} from './services/backgroundJobs';
export {
  enqueuePyroJob,
  getPyroJobPayloadTemplate,
  getPyroJobStatus,
  listRunnablePyroJobTypes,
  pyroJobsService,
  rerunPyroJob,
} from './services/pyroJobs';
export type {
  ManualPyroJobRunResult,
  PyroJobDetail,
} from './services/pyroJobs';
export { crmLeadsApi } from './services/crmLeads';
export type { RecallPreviewLead } from './services/crmLeads';
export { crmRecordsApi } from './services/crmRecords';
export type { CrmRecord } from './services/crmRecords';
export { entityTypesApi } from './services/entityTypes';
export type { TenantEntityType } from './services/entityTypes';
export { teamAnalyticsApi } from './services/teamAnalytics';
export { cseAnalyticsApi } from './services/cseAnalytics';
export { zohoMailService } from './services/zohoMail';
export type {
  ZohoMailConnectResponse,
  ZohoMailStatusResponse,
  ZohoMailSyncResult,
} from './services/zohoMail';
export type {
  CseOverviewData,
  CseMemberData,
  CseTimeSeriesPoint,
  CseAttributeOption,
  CseFilterOptions,
  CseFilterParams,
  AnalyticsBoardsResponse,
} from './services/cseAnalytics';
export {
  SUPPORT_DAILY_LIMIT_SELF_TRIAL_KEY,
  SUPPORT_DAILY_LIMIT_OTHER_KEY,
  SUPPORT_RESOLVE_RATE_GOAL_KEY,
  resolveDailyFreshLeadLimitFromKv,
  resolveGroupIdFromKv,
  resolveSupportDailyLimitsFromKv,
  resolveSupportResolveRateGoalFromKv,
  leadTypeAssignmentApi,
  groupsApi,
} from './services/userSettings';

