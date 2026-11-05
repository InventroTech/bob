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

// Performance tab numbers, pre-aggregated in Postgres (GROUP BY/DISTINCT
// ON) instead of shipping every raw CALL_TOUCH row for the browser to sum
// — see RmPerformanceSummaryView's docstring for why (a busy tenant can
// log 15-20k+ touches in a single day; the old raw-row download for a
// multi-day range was taking 10+ minutes).
export interface RmPerformanceSummaryByRmDto {
  rm_user_id: string;
  rm_name: string;
  manager_name: string;
  state: string;
  touches: number;
  unique_leads: number;
  disposition_counts: Partial<Record<RmActivityUpdatedStatus, number>>;
}

export interface RmPerformanceSummaryTeamDto {
  touches: number;
  unique_leads: number;
  disposition_counts: Partial<Record<RmActivityUpdatedStatus, number>>;
}

export interface RmPerformanceSummaryDto {
  by_rm: RmPerformanceSummaryByRmDto[];
  team: RmPerformanceSummaryTeamDto;
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

// The RM PRD dashboard re-fetches everything (events, targets, filter
// options, active sessions) on every mount AND on every tab-visibility
// change (see RmPrdAnalyticsComponent's refreshTick) — alt-tabbing away and
// back refires the whole pipeline every single time with no debounce. This
// module-level cache means a repeat call with the identical params within
// the TTL window is served instantly instead of re-hitting the network,
// and concurrent identical calls (e.g. two components mounting at once)
// collapse into a single in-flight request instead of firing twice.
// Deliberately NOT applied to getActiveSessions — that endpoint's entire
// point is "is this true right now", and caching it would show a stale
// "on lead" badge for up to the TTL after the real disposition landed.
interface CacheEntry<T> {
  expiresAt: number;
  promise: Promise<T>;
}
const requestCache = new Map<string, CacheEntry<unknown>>();

function cachedCall<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const existing = requestCache.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) return existing.promise;

  const promise = fetcher().catch((err) => {
    // a failed fetch must not poison the cache — the next call should retry
    // the network, not keep replaying the same rejection until the TTL expires
    requestCache.delete(key);
    throw err;
  });
  requestCache.set(key, { expiresAt: now + ttlMs, promise });
  return promise;
}

// Lets the dashboard's manual Refresh button force a real network call
// regardless of TTL — bypassing the cache's "good enough for now" default
// when the RM/manager explicitly asked for the latest numbers.
export function clearRmActivityCache(): void {
  requestCache.clear();
}

// Short enough that a deliberate "I want fresh numbers right now" (waiting
// a beat, then hitting Refresh, or just coming back after a few minutes)
// still gets a real network call almost every time; long enough to absorb
// rapid alt-tab flapping and duplicate concurrent mounts.
const EVENTS_CACHE_TTL_MS = 20_000;
// Managers/states/lead-groups rarely change mid-session — matches the
// backend's own ~60s cache on this endpoint (see RmPrdFilterOptionsView),
// so there's no point refetching more often than the server would even
// recompute.
const FILTER_OPTIONS_CACHE_TTL_MS = 60_000;

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

async function fetchEventWindow(
  params: { from?: string; to?: string; rmUserId?: string; managerUserId?: string },
  signal?: AbortSignal
): Promise<RmActivityEventDto[]> {
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
      signal,
    });
    const pageRows = response.data.data;
    rows.push(...pageRows);
    // an empty page means there's nothing left, regardless of what
    // next_page_link claims — don't trust it alone to end the loop
    if (pageRows.length === 0 || !response.data.page_meta.next_page_link) break;
  }
  return rows;
}

type GetEventsParams = { from?: string; to?: string; rmUserId?: string; managerUserId?: string };

// Shared by getEvents (cached) and getEventsAbortable (cancellable, used by
// the dashboard's live filter UI) — day-splitting, bounded concurrency, and
// per-day partial-failure handling are identical either way; only whether a
// signal is threaded through and whether the result is cached differs.
async function fetchAllDays(params: GetEventsParams, signal?: AbortSignal): Promise<RmActivityEventDto[]> {
  const days = splitIntoDayWindows(params.from, params.to);
  if (!days || days.length === 1) {
    return fetchEventWindow(params, signal);
  }

  // One slow/erroring day (timeout, transient 5xx, whatever) used to take
  // the whole range down with it: Promise.all rejects the instant any
  // worker throws, discarding every other day that already succeeded —
  // forcing a full retry that just hits the same bad day again. Each day
  // is caught independently here instead, so 29 good days out of 30 still
  // render; only a day that genuinely failed is missing, and only a TOTAL
  // wipeout (every single day failed) is still treated as a real error.
  const perDay: RmActivityEventDto[][] = new Array(days.length);
  const failedDays: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < days.length) {
      const index = next++;
      try {
        perDay[index] = await fetchEventWindow({ ...params, from: days[index], to: days[index] }, signal);
      } catch (err) {
        perDay[index] = [];
        failedDays.push(days[index]);
        console.warn(`[rmActivityApi] day ${days[index]} failed, continuing with the rest`, err);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL_DAY_WINDOWS, days.length) }, worker));

  if (failedDays.length === days.length) {
    throw new Error(`Failed to load events for all ${days.length} day(s) in the selected range`);
  }
  if (failedDays.length > 0) {
    console.warn(
      `[rmActivityApi] ${failedDays.length}/${days.length} day(s) failed to load (${failedDays.join(', ')}) — showing partial data`
    );
  }
  return perDay.flat();
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
  async getEvents(params?: GetEventsParams): Promise<RmActivityEventDto[]> {
    const cacheKey = `events:${JSON.stringify(params ?? {})}`;
    return cachedCall(cacheKey, EVENTS_CACHE_TTL_MS, () => fetchAllDays(params ?? {}));
  },

  /**
   * Same as getEvents, but cancellable and never served from/written to the
   * shared request cache — for the dashboard's own live filter UI, where a
   * fast date-range change must actually stop the OLD range's in-flight
   * day-window requests (rather than let them keep consuming the 3-slot
   * concurrency pool and backend capacity for a result nobody will use)
   * instead of just discarding the result once it arrives. Pass the same
   * AbortController you'd pass to fetch(); aborting it rejects this with
   * an AbortError-like rejection, which the caller should treat as "ignore,
   * a newer request superseded this one", not a real failure.
   */
  async getEventsAbortable(params: GetEventsParams, signal: AbortSignal): Promise<RmActivityEventDto[]> {
    return fetchAllDays(params, signal);
  },

  /**
   * Performance tab numbers (touches, unique leads, disposition counts,
   * trials achieved) pre-aggregated server-side — one request, computed in
   * Postgres, instead of the old multi-day raw-row download this replaced.
   * Same from/to/rmUserId/managerUserId scoping as getEvents, PLUS the
   * filter bar's managerName/leadGroup/state/party refinements — these
   * must be passed through exactly, or switching one of them while on the
   * Performance/Leaderboard tab would silently show unfiltered numbers
   * while Adherence (still built from the client-filtered raw events)
   * correctly narrows down. Cancellable and deliberately uncached, same
   * reasoning as getEventsAbortable: a fast filter change should abort the
   * stale request outright, not share an in-flight promise across callers
   * with different lifecycles.
   */
  async getPerformanceSummary(
    params: GetEventsParams & { managerName?: string; leadGroup?: string; state?: string; party?: string },
    signal?: AbortSignal
  ): Promise<RmPerformanceSummaryDto> {
    const response = await apiClient.get<RmPerformanceSummaryDto>('/analytics/rm-performance-summary/', {
      params: {
        from: params.from,
        to: params.to,
        rm_user_id: params.rmUserId,
        manager_user_id: params.managerUserId,
        manager_name: params.managerName,
        lead_group: params.leadGroup,
        state: params.state,
        party: params.party,
      },
      signal,
    });
    return response.data;
  },

  /** Real filter-bar values — managers from TenantMembership, groups from
   * user_settings.Group, states/parties from what's actually on real leads.
   * `managerRoleKeys` scopes the `managers` list to specific tenant roles
   * (RM PRD config's managerRoles) — omit/empty to use the backend's own
   * fallback (anyone with a direct report). */
  async getFilterOptions(params?: { managerRoleKeys?: string[] }): Promise<RmFilterOptionsDto> {
    const roleKeys = params?.managerRoleKeys?.length ? params.managerRoleKeys.join(',') : '';
    return cachedCall(`filterOptions:${roleKeys}`, FILTER_OPTIONS_CACHE_TTL_MS, async () => {
      const response = await apiClient.get<RmFilterOptionsDto>('/analytics/rm-filter-options/', {
        params: { manager_role_keys: roleKeys || undefined },
      });
      return response.data;
    });
  },

  /**
   * Per-RM trial targets, keyed by rm_user_id, already summed across
   * `from`/`to` (YYYY-MM-DD, defaults to today).
   */
  async getDailyTargets(params?: { from?: string; to?: string }): Promise<RmDailyTargetsDto> {
    const cacheKey = `dailyTargets:${JSON.stringify(params ?? {})}`;
    return cachedCall(cacheKey, EVENTS_CACHE_TTL_MS, async () => {
      const response = await apiClient.get<RmDailyTargetsDto>('/analytics/rm-daily-targets/', {
        params: { from: params?.from, to: params?.to },
      });
      return response.data;
    });
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
