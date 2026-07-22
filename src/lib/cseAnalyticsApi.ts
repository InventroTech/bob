import { createApiClient } from '@/lib/api/client';

const BASE_URL =
  import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '') ||
  import.meta.env.VITE_API_URI?.replace(/\/+$/, '');

const apiClient = createApiClient(BASE_URL || '');

export interface CseOverviewData {
  open_call_back: number;
  open_not_connected: number;
  leads_assigned: number;
  resolved: number;
  not_connected: number;
  call_later: number;
  cant_resolve: number;
  resolve_rate: number | null;
  average_handling_time_seconds: number | null;
  handling_time_ticket_count: number;
}

export interface CseMemberData {
  cse_name: string;
  manager_i_name: string;
  open_call_back: number;
  open_not_connected: number;
  leads_assigned: number;
  resolved: number;
  resolve_rate: number | null;
  average_handling_time_seconds: number | null;
  handling_time_ticket_count: number;
}

export interface CseTimeSeriesPoint {
  date: string;
  assigned: number;
  resolved: number;
  not_connected: number;
  call_later: number;
  resolve_rate: number | null;
  average_handling_time_seconds: number | null;
  handling_time_ticket_count: number;
  stacked_resolved: number;
  stacked_unresolved: number;
}

export interface CseAttributeOption {
  key: string;
  label: string;
  values: string[];
}

export interface CseFilterOptions {
  ticket_types: string[];
  cse_names: string[];
  handling_time_statuses: string[];
  attributes?: CseAttributeOption[];
  visibility_scope?: string;
}

export interface CseSupportTicketBreakdown {
  total: number;
  by_type: Array<{ ticket_type: string; count: number }>;
  by_status: Array<{ resolution_status: string; count: number }>;
  available_types: string[];
  available_statuses: string[];
}

type DateParams = { date?: string; from?: string; to?: string };

export type CseFilterParams = DateParams & {
  ticket_type?: string;
  handling_status?: string;
  cse_name?: string;
  af?: string;
};

function buildParams(params: CseFilterParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.date) query.date = params.date;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.ticket_type) query.ticket_type = params.ticket_type;
  if (params.handling_status) query.handling_status = params.handling_status;
  if (params.cse_name) query.cse_name = params.cse_name;
  if (params.af) query.af = params.af;
  return query;
}

export interface AnalyticsBoardsResponse<T = unknown> {
  board_type: string;
  boards: T[];
}

export const cseAnalyticsApi = {
  async getAvailableTypes(): Promise<Array<'cse' | 'rm'>> {
    const response = await apiClient.get('/analytics/available-types/');
    return Array.isArray(response.data?.types) ? response.data.types : [];
  },

  async getFilterOptions(): Promise<CseFilterOptions> {
    const response = await apiClient.get('/analytics/cse/filter-options/');
    return response.data;
  },

  async getSupportTicketBreakdown(params?: {
    ticket_type?: string;
    resolution_status?: string;
  }): Promise<CseSupportTicketBreakdown> {
    const response = await apiClient.get('/analytics/cse/support-ticket-breakdown/', {
      params,
    });
    return response.data;
  },

  // Each board is one row. List / create / update / delete individually.
  async getBoards<T = unknown>(type: string): Promise<T[]> {
    const response = await apiClient.get<AnalyticsBoardsResponse<T>>(
      '/analytics/board/',
      { params: { type } }
    );
    return response.data?.boards || [];
  },

  async createBoard<T = unknown>(type: string, config: T): Promise<T> {
    const response = await apiClient.post('/analytics/board/', { type, config });
    return response.data?.config;
  },

  async updateBoard<T = unknown>(
    type: string,
    reportId: string,
    config: T
  ): Promise<T> {
    const response = await apiClient.put(
      `/analytics/board/${encodeURIComponent(reportId)}/`,
      { type, config }
    );
    return response.data?.config;
  },

  async deleteBoard(type: string, reportId: string): Promise<void> {
    await apiClient.delete(`/analytics/board/${encodeURIComponent(reportId)}/`, {
      params: { type },
    });
  },

  async getOverview(params: CseFilterParams): Promise<CseOverviewData> {
    const response = await apiClient.get('/analytics/cse/overview/', {
      params: buildParams(params),
    });
    return response.data;
  },

  async getMembers(params: CseFilterParams): Promise<CseMemberData[]> {
    const response = await apiClient.get('/analytics/cse/members/', {
      params: buildParams(params),
    });
    return response.data;
  },

  async getTimeSeries(params: CseFilterParams): Promise<CseTimeSeriesPoint[]> {
    const response = await apiClient.get('/analytics/cse/time-series/', {
      params: buildParams(params),
    });
    return response.data;
  },
};
