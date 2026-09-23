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
  states: string[];
  parties: string[];
}

// rm_user_id -> that RM's DAILY_TARGET user setting (same value the Team
// Dashboard's "Trial Target" sums up). RMs with no target set are simply
// absent from this map.
export type RmDailyTargetsDto = Record<string, number>;

interface RmActivityEventsPage {
  data: RmActivityEventDto[];
  page_meta: { next_page_link: string | null };
}

export const rmActivityApi = {
  /**
   * `from`/`to` are "YYYY-MM-DD" — omit both to get the backend's default
   * (today only), never the whole tenant table. `rmUserId` narrows to one
   * RM's own rows (e.g. the lead-card "Your Shift" panel), omit for every
   * RM. Pages through the response until exhausted; a date/RM-windowed
   * query is almost always a single page.
   */
  async getEvents(params?: { from?: string; to?: string; rmUserId?: string }): Promise<RmActivityEventDto[]> {
    const rows: RmActivityEventDto[] = [];
    let page = 1;
    // date/RM-windowed queries are small; this is just a backstop against a
    // next_page_link that never resolves to null (backend bug or bad state)
    const MAX_PAGES = 200;
    for (let i = 0; i < MAX_PAGES; i++) {
      const response = await apiClient.get<RmActivityEventsPage>('/analytics/rm-activity-events/', {
        params: {
          from: params?.from,
          to: params?.to,
          rm_user_id: params?.rmUserId,
          page,
          page_size: 2000,
          include_count: false,
        },
      });
      const pageRows = response.data.data;
      rows.push(...pageRows);
      // an empty page means there's nothing left, regardless of what
      // next_page_link claims — don't trust it alone to end the loop
      if (pageRows.length === 0 || !response.data.page_meta.next_page_link) break;
      page += 1;
    }
    return rows;
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
