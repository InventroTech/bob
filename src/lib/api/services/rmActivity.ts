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
  /** Page/carousel title the lead was opened from (e.g. "All Leads",
   * "Pending Leads") — absent/empty for rows written before this was tracked. */
  opened_from: string | null;
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

// A lead open *right now* — an RmCallSession not yet consumed by a
// disposition (see RmActiveSessionsView on the backend). rm_activity_events
// never carries an in-progress row, so this is the only source for "is this
// RM currently on a lead".
export interface RmActiveSessionDto {
  rm_user_id: string;
  lead_record_id: number | null;
  started_at: string;
}

interface RmActivityEventsPage {
  data: RmActivityEventDto[];
  page_meta: { next_page_link: string | null };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 2000;
// date/RM-windowed queries are small; this is just a backstop against a
// next_page_link that never resolves to null (backend bug or bad state)
const MAX_PAGES_PER_WINDOW = 200;
const PARALLEL_DAY_WINDOWS = 3;

const parseIsoDay = (value: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
};

/**
 * Splits an inclusive `from`/`to` range (YYYY-MM-DD) into single days, oldest first.
 * The backend filters `from <= started_at < to + 1 day`, so per-day windows return
 * exactly the same rows as one big window. Returns null when the range can't be
 * split (missing/invalid dates, or `to` before `from`); callers then send it as-is.
 */
export function splitIntoDayWindows(from?: string, to?: string): string[] | null {
  if (!from || !to) return null;
  const start = parseIsoDay(from);
  const end = parseIsoDay(to);
  if (start === null || end === null || end < start) return null;
  const days: string[] = [];
  for (let ms = start; ms <= end; ms += DAY_MS) {
    days.push(new Date(ms).toISOString().slice(0, 10));
  }
  return days;
}

async function fetchEventWindow(params: {
  from?: string;
  to?: string;
  rmUserId?: string;
  managerUserId?: string;
}): Promise<RmActivityEventDto[]> {
  const rows: RmActivityEventDto[] = [];
  for (let page = 1; page <= MAX_PAGES_PER_WINDOW; page++) {
    const response = await apiClient.get<RmActivityEventsPage>('/analytics/rm-activity-events/', {
      params: {
        from: params.from,
        to: params.to,
        rm_user_id: params.rmUserId,
        manager_user_id: params.managerUserId,
        page,
        page_size: PAGE_SIZE,
        include_count: false,
      },
    });
    const pageRows = response.data.data;
    rows.push(...pageRows);
    // an empty page means there's nothing left, regardless of what
    // next_page_link claims — don't trust it alone to end the loop
    if (pageRows.length === 0 || !response.data.page_meta.next_page_link) break;
  }
  return rows;
}

export const rmActivityApi = {
  /**
   * `from`/`to` are "YYYY-MM-DD" — omit both to get the backend's default
   * (today only), never the whole tenant table. `rmUserId` narrows to one
   * RM's own rows (e.g. the lead-card "Your Shift" panel), omit for every
   * RM. `managerUserId` narrows to one manager's own hierarchy — direct +
   * indirect reports (RM PRD's ASM "my team" view) — omit for the whole
   * tenant. Pages through the response until exhausted.
   *
   * Multi-day ranges are fetched one day at a time: the backend pages with
   * OFFSET, so one 30-day tenant-wide window reached OFFSET ~400k and each
   * deep page took seconds (and the page cap silently dropped rows past it).
   */
  async getEvents(params?: {
    from?: string;
    to?: string;
    rmUserId?: string;
    managerUserId?: string;
  }): Promise<RmActivityEventDto[]> {
    const days = splitIntoDayWindows(params?.from, params?.to);
    if (!days || days.length === 1) {
      return fetchEventWindow(params ?? {});
    }

    const perDay: RmActivityEventDto[][] = new Array(days.length);
    let next = 0;
    const worker = async () => {
      while (next < days.length) {
        const index = next++;
        perDay[index] = await fetchEventWindow({ ...params, from: days[index], to: days[index] });
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL_DAY_WINDOWS, days.length) }, worker));
    return perDay.flat();
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
   * `from`/`to` (YYYY-MM-DD, defaults to today).
   */
  async getDailyTargets(params?: { from?: string; to?: string }): Promise<RmDailyTargetsDto> {
    const response = await apiClient.get<RmDailyTargetsDto>('/analytics/rm-daily-targets/', {
      params: { from: params?.from, to: params?.to },
    });
    return response.data;
  },

  /**
   * Which RMs have a lead open right now. No date range — this is a live,
   * present-moment fact, not a historical window. `rmUserId`/`managerUserId`
   * scope it the same way getEvents does; omit both for the whole tenant.
   */
  async getActiveSessions(params?: { rmUserId?: string; managerUserId?: string }): Promise<RmActiveSessionDto[]> {
    const response = await apiClient.get<RmActiveSessionDto[]>('/analytics/rm-active-sessions/', {
      params: { rm_user_id: params?.rmUserId, manager_user_id: params?.managerUserId },
    });
    return response.data;
  },
};
