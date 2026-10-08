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
  // the human-facing id shown on the lead in the app (e.g. "1793876") —
  // lead_record_id above is only the internal DB row id, never shown to a
  // manager reading this dashboard
  praja_id: string | null;
  updated_status: RmActivityUpdatedStatus | null;
  lead_group: string | null;
  party: string | null;
  reason: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface RmActivityEventDto {
  id: number;
  event_type: RmActivityEventType;
  event_data: RmActivityEventDataDto;
}

// value is the raw Circle ID (matches event_data.state); label is the
// resolved Circle name for display, falling back to the raw ID server-side
// for any value geo_party_catalog doesn't recognize.
export interface RmStateFilterOptionDto {
  value: string;
  label: string;
}

export interface RmFilterOptionsDto {
  managers: string[];
  lead_groups: string[];
  states: RmStateFilterOptionDto[];
  parties: string[];
}

// rm_user_id -> that RM's target, already summed across the requested date
// range (see rmActivityApi.getDailyTargets). RMs with nothing set at all
// (no override, no standing DAILY_TARGET) are simply absent from this map.
export type RmDailyTargetsDto = Record<string, number>;

interface RmActivityEventsPage {
  data: RmActivityEventDto[];
  page_meta: { next_page_link: string | null };
}

export const rmActivityApi = {
  /**
   * `from`/`to` are "YYYY-MM-DD" — omit both to get the backend's default
   * (today only), never the whole tenant table. `rmUserId` narrows to one
   * RM's own rows (e.g. the lead-card "Your Shift" panel). `rmUserIds`
   * narrows to a known set of RMs (e.g. the lead-card leaderboard's "my
   * manager's team" — a sibling group, not just one RM) — the backend does
   * this filtering, not a client-side slice of everyone's rows. Omit both
   * for every RM. Pages through the response until exhausted; a date/RM-
   * windowed query is almost always a single page.
   */
  async getEvents(params?: {
    from?: string;
    to?: string;
    rmUserId?: string;
    rmUserIds?: string[];
  }): Promise<RmActivityEventDto[]> {
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
          rm_user_ids: params?.rmUserIds?.length ? params.rmUserIds.join(',') : undefined,
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

  /** Real filter-bar values — managers from TenantMembership, groups from
   * user_settings.Group, states/parties from what's actually on real leads.
   * `managerRoleKeys` scopes the `managers` list to specific tenant roles
   * (RM PRD config's managerRoles) — omit/empty to use the backend's own
   * fallback (anyone with a direct report). */
  async getFilterOptions(params?: { managerRoleKeys?: string[] }): Promise<RmFilterOptionsDto> {
    const response = await apiClient.get<RmFilterOptionsDto>('/analytics/rm-filter-options/', {
      params: {
        manager_role_keys: params?.managerRoleKeys?.length ? params.managerRoleKeys.join(',') : undefined,
      },
    });
    return response.data;
  },

  /**
   * Per-RM trial targets, keyed by rm_user_id, already summed across
   * `from`/`to` (YYYY-MM-DD, defaults to today). `rmUserIds` scopes the
   * response to a known set of RMs instead of every active member in the
   * tenant — same precedent as getEvents' `rmUserIds`.
   */
  async getDailyTargets(params?: {
    from?: string;
    to?: string;
    rmUserIds?: string[];
  }): Promise<RmDailyTargetsDto> {
    const response = await apiClient.get<RmDailyTargetsDto>('/analytics/rm-daily-targets/', {
      params: {
        from: params?.from,
        to: params?.to,
        rm_user_ids: params?.rmUserIds?.length ? params.rmUserIds.join(',') : undefined,
      },
    });
    return response.data;
  },
};
