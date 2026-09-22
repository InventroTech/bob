import { apiClient } from '../client';

/**
 * RM PRD Analytics API client.
 * One flat GET — the backend returns every rm_activity_events row for the
 * current tenant, and the dashboard does its own grouping/summing.
 */

export type RmActivityEventType = 'CALL_TOUCH' | 'LOGIN' | 'LOGOUT' | 'BREAK_START' | 'BREAK_END';
export type RmActivityUpdatedStatus = 'NOT_CONNECTED' | 'CALL_BACK' | 'NOT_INTERESTED' | 'TRIAL_ACTIVATED';

// Shaped like crm_records.Record: a couple of real columns (id, event_type)
// plus one JSON event_data blob holding everything else.
export interface RmActivityEventDataDto {
  rm_user_id: string;
  rm_name: string;
  manager_name: string;
  team: string;
  state: string;
  lead_record_id: number | null;
  updated_status: RmActivityUpdatedStatus | null;
  lead_bucket: string | null;
  party: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface RmActivityEventDto {
  id: number;
  event_type: RmActivityEventType;
  event_data: RmActivityEventDataDto;
}

export interface RmFilterOptionsDto {
  managers: string[];
  lead_buckets: string[];
  states: string[];
  parties: string[];
}

// rm_user_id -> that RM's DAILY_TARGET user setting (same value the Team
// Dashboard's "Trial Target" sums up). RMs with no target set are simply
// absent from this map.
export type RmDailyTargetsDto = Record<string, number>;

export const rmActivityApi = {
  async getEvents(): Promise<RmActivityEventDto[]> {
    const response = await apiClient.get<RmActivityEventDto[]>('/analytics/rm-activity-events/');
    return response.data;
  },

  /** Real filter-bar values — managers from TenantMembership, buckets from
   * crm_records.Bucket, states/parties from what's actually on real leads. */
  async getFilterOptions(): Promise<RmFilterOptionsDto> {
    const response = await apiClient.get<RmFilterOptionsDto>('/analytics/rm-filter-options/');
    return response.data;
  },

  /** Per-RM daily trial targets, keyed by rm_user_id. */
  async getDailyTargets(): Promise<RmDailyTargetsDto> {
    const response = await apiClient.get<RmDailyTargetsDto>('/analytics/rm-daily-targets/');
    return response.data;
  },
};
