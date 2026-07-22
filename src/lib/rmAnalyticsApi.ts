import { createApiClient } from '@/lib/api/client';

const BASE_URL =
  import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '') ||
  import.meta.env.VITE_API_URI?.replace(/\/+$/, '');

const apiClient = createApiClient(BASE_URL || '');

export interface RmOverviewData {
  attendance: number;
  calls_made: number;
  calls_connected: number;
  trials_activated: number;
  connected_to_trial_ratio: number | null;
  average_time_spent_seconds: number | null;
  handling_time_volume: number;
  take_break_count: number;
  not_interested_count: number;
  allotted_leads: number;
  unassigned_leads: number;
}

export interface RmMemberData {
  rm_name: string;
  manager_i_name: string;
  user_id: string;
  attendance: number;
  calls_made: number;
  calls_connected: number;
  trials_activated: number;
  connected_to_trial_ratio: number | null;
  average_time_spent_seconds: number | null;
  handling_time_volume: number;
  take_break_count: number;
  not_interested_count: number;
  allotted_leads: number;
}

export interface RmTimeSeriesPoint {
  date: string;
  attendance: number;
  calls_made: number;
  calls_connected: number;
  trials_activated: number;
  connected_to_trial_ratio: number | null;
  average_time_spent_seconds: number | null;
  handling_time_volume: number;
  take_break_count: number;
  not_interested_count: number;
}

export interface RmAttributeOption {
  key: string;
  label: string;
  values: string[];
}

export interface RmFilterOptions {
  attributes?: RmAttributeOption[];
  visibility_scope?: string;
}

type DateParams = { date?: string; from?: string; to?: string };

export type RmFilterParams = DateParams & {
  af?: string;
};

function buildParams(params: RmFilterParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.date) query.date = params.date;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.af) query.af = params.af;
  return query;
}

export const rmAnalyticsApi = {
  async getFilterOptions(): Promise<RmFilterOptions> {
    const response = await apiClient.get('/analytics/rm/filter-options/');
    return response.data;
  },

  async getOverview(params: RmFilterParams): Promise<RmOverviewData> {
    const response = await apiClient.get('/analytics/rm/overview/', {
      params: buildParams(params),
    });
    return response.data;
  },

  async getMembers(params: RmFilterParams): Promise<RmMemberData[]> {
    const response = await apiClient.get('/analytics/rm/members/', {
      params: buildParams(params),
    });
    return response.data;
  },

  async getTimeSeries(params: RmFilterParams): Promise<RmTimeSeriesPoint[]> {
    const response = await apiClient.get('/analytics/rm/time-series/', {
      params: buildParams(params),
    });
    return response.data;
  },
};
