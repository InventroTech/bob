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
  stacked_resolved: number;
  stacked_unresolved: number;
}

export interface CseFilterOptions {
  ticket_types: string[];
  cse_names: string[];
  handling_time_statuses: string[];
}

type DateParams = { date?: string; from?: string; to?: string };

export type CseFilterParams = DateParams & {
  ticket_type?: string;
  handling_status?: string;
  cse_name?: string;
};

function buildParams(params: CseFilterParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.date) query.date = params.date;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.ticket_type) query.ticket_type = params.ticket_type;
  if (params.handling_status) query.handling_status = params.handling_status;
  if (params.cse_name) query.cse_name = params.cse_name;
  return query;
}

export const cseAnalyticsApi = {
  async getFilterOptions(): Promise<CseFilterOptions> {
    const response = await apiClient.get('/analytics/cse/filter-options/');
    return response.data;
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
