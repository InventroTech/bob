import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  achtThresholds,
  computeAchtOverall,
  computeAdherenceByRm,
  computePerformanceByRm,
  computeShiftTimeAverages,
  computeTeamTotals,
  formatVsTarget,
  type RmAdherenceRow,
  type RmPerformanceRow,
} from './rm-prd-analytics/aggregate';
import { useRmActivityEvents } from './rm-prd-analytics/useRmActivityEvents';
import { useRmDailyTargets } from './rm-prd-analytics/useRmDailyTargets';
import {
  stateNameLookup,
  useRmFilterOptions,
  type RmFilterOptions,
  type RmStateFilterOption,
} from './rm-prd-analytics/useRmFilterOptions';
import { filterByDateRange, resolveDateRange } from './rm-prd-analytics/dateRange';
import { TouchReportSheet } from './rm-prd-analytics/TouchReportSheet';
import type { DrillFilter } from './rm-prd-analytics/touchData';
import type { RmActivityEvent } from './rm-prd-analytics/types';
import { useAuth } from '@/hooks/useAuth';
import { useSpoofUserId } from '@/lib/auth/spoof';
import { RefreshCw, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';

// The filter-bar controls a manager can individually show/hide via config —
// keyed the same as Filters below so FilterBar can look visibility up directly.
export type RmPrdFilterKey = 'manager' | 'dateRange' | 'leadGroup' | 'state' | 'party';

export type RmPrdViewMode = 'manager' | 'rm';

export interface RmPrdAnalyticsConfig {
  title?: string;
  /**
   * Which filter-bar controls to show. A key missing from this map (not
   * explicitly `false`) defaults to visible — so a page saved before this
   * option existed, or a config that only mentions the filter it wants
   * hidden, still shows every other filter it always has.
   */
  visibleFilters?: Partial<Record<RmPrdFilterKey, boolean>>;
  /**
   * 'manager' (default, missing = 'manager') is today's whole-team
   * dashboard. 'rm' scopes everything to the signed-in RM's own data only
   * — the fetch itself is narrowed server-side to their rm_user_id (not
   * just a client-side filter over the team), the Manager filter and the
   * "By RM" table are hidden (both are meaningless for a one-person view),
   * and the numbers you see are already just yours. Meant for a page an RM
   * themselves is given access to, not a manager's team view.
   */
  viewMode?: RmPrdViewMode;
  /**
   * Which tenant roles (Role.key) count as "manager" for the Manager
   * filter dropdown. Tenants often have several manager-shaped roles (Team
   * Lead, Zonal Head, GM, ...), so this is picked explicitly rather than
   * inferred — the old behavior (anyone with a direct report) pulled in
   * wrong/unexpected names whenever an RM happened to have a report for
   * some unrelated reason. Empty/unset falls back to that old heuristic,
   * so existing pages don't suddenly show an empty filter.
   */
  managerRoles?: string[];
}

interface RmPrdAnalyticsComponentProps {
  config?: RmPrdAnalyticsConfig;
}

export const isFilterVisible = (config: RmPrdAnalyticsConfig | undefined, key: RmPrdFilterKey): boolean =>
  config?.visibleFilters?.[key] !== false;

// Manager is force-hidden in RM view regardless of visibleFilters — the
// fetch there is already narrowed to one RM, so filtering by manager name
// is meaningless, not a matter of visual preference.
export const shouldShowFilter = (
  config: RmPrdAnalyticsConfig | undefined,
  key: RmPrdFilterKey,
  isRmView: boolean
): boolean => {
  if (key === 'manager' && isRmView) return false;
  return isFilterVisible(config, key);
};

type Tab = 'performance' | 'adherence';

const DEFAULT_FILTERS = {
  manager: 'All managers',
  dateRange: 'Today',
  leadGroup: 'All groups',
  state: 'All states',
  party: 'All parties',
  customFrom: '',
  customTo: '',
};

type Filters = typeof DEFAULT_FILTERS;

// Persists the filter bar (and which tab was open) across page reloads/revisits —
// otherwise every remount of this component (e.g. a page-config refetch) silently
// snapped everything back to the defaults. Keyed per-tenant (see currentTenantSlug)
// so switching tenants in the same browser profile doesn't leak one tenant's
// filter picks as another's.
function currentTenantSlug(): string {
  if (typeof window === 'undefined') return 'unknown-tenant';
  try {
    // useTenant() already caches the active tenant's slug here as a side
    // effect on every mount — reading it directly keeps these storage keys
    // synchronous (they're computed as useState initializers, before any
    // hook/effect has resolved a fresh tenant fetch).
    return window.localStorage.getItem('tenant_slug') || 'unknown-tenant';
  } catch {
    return 'unknown-tenant';
  }
}

const filtersStorageKey = () => `rmPrdAnalytics.filters.${currentTenantSlug()}`;
const tabStorageKey = () => `rmPrdAnalytics.tab.${currentTenantSlug()}`;

function loadStoredFilters(): Filters {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  try {
    const raw = window.localStorage.getItem(filtersStorageKey());
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function loadStoredTab(): Tab {
  if (typeof window === 'undefined') return 'performance';
  return window.localStorage.getItem(tabStorageKey()) === 'adherence' ? 'adherence' : 'performance';
}

// The RM PRD analytics dashboard. Every number comes from rm_activity_events
// rows fetched from the backend — see useRmActivityEvents + aggregate.ts.
// Manager/leadGroup/state/party/date-range all filter visibleEvents (see below).
export const RmPrdAnalyticsComponent: React.FC<RmPrdAnalyticsComponentProps> = ({ config }) => {
  const { options: filterOptions } = useRmFilterOptions(config?.managerRoles);
  // raw Circle state ID -> resolved name, for the "By RM" tables and RM
  // detail header — anywhere besides the filter dropdown itself that
  // displays an RmActivityEvent's own `state` field as text
  const stateNameById = useMemo(() => stateNameLookup(filterOptions.states), [filterOptions.states]);
  const { session } = useAuth();
  const spoofUserId = useSpoofUserId();
  // spoofUserId lets an admin preview another RM's own view while testing —
  // same precedent as LeadProgressBar/useLeadCardCarousel
  const activeUserId = spoofUserId ?? session?.user?.id ?? null;
  const isRmView = config?.viewMode === 'rm';
  const [tab, setTab] = useState<Tab>(loadStoredTab);
  const [filters, setFilters] = useState<Filters>(loadStoredFilters);
  const [drill, setDrill] = useState<DrillFilter | null>(null);
  // when the touch report was opened from inside an RM's own detail modal,
  // this scopes it to just that RM instead of every visible RM
  const [drillRmUserId, setDrillRmUserId] = useState<string | null>(null);
  const [rmSearch, setRmSearch] = useState('');
  const [selectedRmUserId, setSelectedRmUserId] = useState<string | null>(null);

  // bumped to force events/targets to refetch: on returning to this tab
  // (switching back from another tab/app — a blind interval kept refetching
  // underneath a manager mid-read and was disruptive) or via the manual
  // Refresh button below.
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setRefreshTick((t) => t + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(filtersStorageKey(), JSON.stringify(filters));
    } catch {
      // localStorage unavailable (e.g. private browsing) — filters just won't persist
    }
  }, [filters]);

  useEffect(() => {
    try {
      window.localStorage.setItem(tabStorageKey(), tab);
    } catch {
      // localStorage unavailable — tab just won't persist
    }
  }, [tab]);

  const dateBounds = useMemo(() => {
    // RM view with no signed-in user resolved yet — bounds=null skips the
    // fetch entirely (see useRmActivityEvents) rather than briefly fetching
    // and showing the whole team's data before activeUserId loads in
    if (isRmView && !activeUserId) return null;
    return resolveDateRange(filters.dateRange, filters.customFrom, filters.customTo);
  }, [filters.dateRange, filters.customFrom, filters.customTo, isRmView, activeUserId]);
  // windows the fetch itself to this range (see useRmActivityEvents) — not
  // just a client-side filter over the whole tenant table anymore;
  // refreshTick keeps it from going stale between manual page reloads.
  // In RM view the fetch itself is narrowed server-side to activeUserId —
  // not a client-side filter over every RM's rows.
  const { events, loading, error } = useRmActivityEvents(
    dateBounds,
    isRmView ? activeUserId ?? undefined : undefined,
    refreshTick
  );
  // targets are already summed server-side across dateBounds (day-by-day
  // overrides where a manager set one, else the RM's standing DAILY_TARGET)
  const { targets: dailyTargets } = useRmDailyTargets(dateBounds, refreshTick);
  const visibleEvents = useMemo(() => {
    let result = filterByDateRange(events, dateBounds);
    if (filters.manager !== 'All managers') result = result.filter((e) => e.managerName === filters.manager);
    // leadGroup/state/party only apply to CALL_TOUCH rows (LOGIN/LOGOUT/
    // BREAK_* rows don't carry a lead's group/state/party) — filtering the
    // whole event stream by them would silently drop real break/login rows
    // and corrupt the login/break/occupancy numbers whenever one of these
    // filters is active
    if (filters.leadGroup !== 'All groups') {
      result = result.filter((e) => e.eventType !== 'CALL_TOUCH' || e.leadGroup === filters.leadGroup);
    }
    if (filters.state !== 'All states') {
      result = result.filter((e) => e.eventType !== 'CALL_TOUCH' || e.state === filters.state);
    }
    if (filters.party !== 'All parties') {
      result = result.filter((e) => e.eventType !== 'CALL_TOUCH' || e.party === filters.party);
    }
    return result;
  }, [events, dateBounds, filters.manager, filters.leadGroup, filters.state, filters.party]);

  const performanceByRm = useMemo(
    () => computePerformanceByRm(visibleEvents, dailyTargets),
    [visibleEvents, dailyTargets]
  );
  const adherenceByRm = useMemo(() => computeAdherenceByRm(visibleEvents), [visibleEvents]);
  const teamTotals = useMemo(
    () => computeTeamTotals(visibleEvents, dailyTargets),
    [visibleEvents, dailyTargets]
  );
  const shiftTimeAverages = useMemo(
    () => computeShiftTimeAverages(visibleEvents, filters.dateRange),
    [visibleEvents, filters.dateRange]
  );
  const achtOverall = useMemo(() => computeAchtOverall(visibleEvents), [visibleEvents]);

  // "By RM" table search — exact-substring match on the RM's name, doesn't
  // touch any of the team-total cards above the table
  const rmSearchTerm = rmSearch.trim().toLowerCase();
  const filteredPerformanceByRm = useMemo(
    () => (rmSearchTerm ? performanceByRm.filter((row) => row.name.toLowerCase().includes(rmSearchTerm)) : performanceByRm),
    [performanceByRm, rmSearchTerm]
  );
  const filteredAdherenceByRm = useMemo(
    () => (rmSearchTerm ? adherenceByRm.filter((row) => row.name.toLowerCase().includes(rmSearchTerm)) : adherenceByRm),
    [adherenceByRm, rmSearchTerm]
  );

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Row click on the "By RM" table opens a detail modal scoped to just that
  // RM's own events — same aggregate functions as the team view, just fed a
  // narrower slice of visibleEvents, so the numbers always match the table.
  const selectedRmEvents = useMemo(
    () => (selectedRmUserId ? visibleEvents.filter((e) => e.rmUserId === selectedRmUserId) : []),
    [visibleEvents, selectedRmUserId]
  );
  const selectedRmTeamTotals = useMemo(
    () => computeTeamTotals(selectedRmEvents, dailyTargets),
    [selectedRmEvents, dailyTargets]
  );
  const selectedRmShiftTimeAverages = useMemo(
    () => computeShiftTimeAverages(selectedRmEvents, filters.dateRange),
    [selectedRmEvents, filters.dateRange]
  );
  const selectedRmAchtOverall = useMemo(() => computeAchtOverall(selectedRmEvents), [selectedRmEvents]);
  const selectedRmProfile: RmActivityEvent | undefined = selectedRmEvents[0];

  const openTeamDrill = (filter: DrillFilter) => {
    setDrillRmUserId(null);
    setDrill(filter);
  };
  const openRmDrill = (filter: DrillFilter) => {
    setDrillRmUserId(selectedRmUserId);
    setDrill(filter);
  };
  const touchReportEvents = useMemo(
    () => (drillRmUserId ? visibleEvents.filter((e) => e.rmUserId === drillRmUserId) : visibleEvents),
    [visibleEvents, drillRmUserId]
  );

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center bg-stone-50 text-sm text-stone-400">
        Loading RM activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Couldn't load RM activity data: {error}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-stone-50 p-6">
      <div className="mb-4 flex items-center justify-between">
        {config?.title ? (
          <h2 className="text-lg font-semibold text-stone-900">{config.title}</h2>
        ) : (
          <div />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshTick((t) => t + 1)}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <FilterBar
        filters={filters}
        filterOptions={filterOptions}
        onChange={setFilter}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        config={config}
        isRmView={isRmView}
      />

      <div className="mt-5 inline-flex rounded-lg border border-stone-200 bg-white p-1">
        <TabButton active={tab === 'adherence'} onClick={() => setTab('adherence')}>
          Adherence
        </TabButton>
        <TabButton active={tab === 'performance'} onClick={() => setTab('performance')}>
          Performance
        </TabButton>
      </div>

      <div className="mt-6">
        {tab === 'performance' ? (
          <PerformanceView
            onDrill={openTeamDrill}
            teamTotals={teamTotals}
            performanceByRm={filteredPerformanceByRm}
            rmSearch={rmSearch}
            onRmSearchChange={setRmSearch}
            onSelectRm={setSelectedRmUserId}
            showByRmTable={!isRmView}
            stateNameById={stateNameById}
          />
        ) : (
          <AdherenceView
            onDrill={openTeamDrill}
            shiftTimeAverages={shiftTimeAverages}
            achtOverall={achtOverall}
            adherenceByRm={filteredAdherenceByRm}
            rmSearch={rmSearch}
            onRmSearchChange={setRmSearch}
            onSelectRm={setSelectedRmUserId}
            showByRmTable={!isRmView}
            stateNameById={stateNameById}
          />
        )}
      </div>

      <RmDetailModal
        open={selectedRmUserId !== null}
        onClose={() => setSelectedRmUserId(null)}
        profile={selectedRmProfile}
        teamTotals={selectedRmTeamTotals}
        shiftTimeAverages={selectedRmShiftTimeAverages}
        achtOverall={selectedRmAchtOverall}
        onDrill={openRmDrill}
        stateNameById={stateNameById}
      />

      <TouchReportSheet
        events={touchReportEvents}
        filter={drill}
        scopeLabel={drillRmUserId ? selectedRmProfile?.rmName : undefined}
        onClose={() => {
          setDrill(null);
          setDrillRmUserId(null);
        }}
        stateNameById={stateNameById}
      />
    </div>
  );
};

export default RmPrdAnalyticsComponent;

// ---- Filter bar ----

const FilterBar: React.FC<{
  filters: Filters;
  filterOptions: RmFilterOptions;
  onChange: (key: keyof Filters, value: string) => void;
  onReset: () => void;
  config?: RmPrdAnalyticsConfig;
  isRmView: boolean;
}> = ({ filters, filterOptions, onChange, onReset, config, isRmView }) => {
  // most fields are plain strings where the value shown IS the filter value
  // — only "state" has a separate display label (Circle name) from its
  // underlying filter value (Circle ID, to match RmActivityEvent.state)
  const asOptions = (values: string[]): RmStateFilterOption[] =>
    values.map((value) => ({ value, label: value }));
  const allFields: Array<{ key: RmPrdFilterKey; label: string; options: RmStateFilterOption[] }> = [
    { key: 'manager', label: 'Manager', options: asOptions(filterOptions.managers) },
    { key: 'dateRange', label: 'Date Range', options: asOptions(filterOptions.dateRanges) },
    { key: 'leadGroup', label: 'Lead Group', options: asOptions(filterOptions.leadGroups) },
    { key: 'state', label: 'State', options: filterOptions.states },
    { key: 'party', label: 'Party', options: asOptions(filterOptions.parties) },
  ];
  // hidden filters keep their current value (e.g. a hidden Date Range still
  // defaults to "Today") — this only controls whether the control renders.
  // Manager is always dropped in RM view regardless of visibleFilters — the
  // fetch is already narrowed to one RM, so filtering by manager is
  // meaningless there, not a matter of visual preference.
  const fields = allFields.filter((field) => shouldShowFilter(config, field.key, isRmView));

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-stone-200 bg-white p-4">
      {fields.map((field) => (
        <div key={field.key} className="min-w-[160px] flex-1">
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-stone-400">
            {field.label}
          </label>
          <Select value={filters[field.key]} onValueChange={(value) => onChange(field.key, value)}>
            <SelectTrigger className="h-10 border-stone-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {filters.dateRange === 'Custom' && (
        <>
          <div className="min-w-[150px] flex-1">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-stone-400">
              From
            </label>
            <Input
              type="date"
              className="h-10 border-stone-200 text-sm"
              value={filters.customFrom}
              max={filters.customTo || undefined}
              onChange={(e) => onChange('customFrom', e.target.value)}
            />
          </div>
          <div className="min-w-[150px] flex-1">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-stone-400">
              To
            </label>
            <Input
              type="date"
              className="h-10 border-stone-200 text-sm"
              value={filters.customTo}
              min={filters.customFrom || undefined}
              onChange={(e) => onChange('customTo', e.target.value)}
            />
          </div>
        </>
      )}

      <Button variant="outline" className="h-10 border-stone-200" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
};

// ---- Tab toggle ----

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'rounded-md px-4 py-2 text-sm font-medium transition-colors',
      active ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800'
    )}
  >
    {children}
  </button>
);

// ---- Shared building blocks ----

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-stone-400">{children}</p>
);

// "By RM" section heading + a search box that filters that table's rows by RM name
const RmTableHeader: React.FC<{
  label: string;
  search: string;
  onSearchChange: (value: string) => void;
}> = ({ label, search, onSearchChange }) => (
  <div className="mb-2 flex items-center justify-between gap-4">
    <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
    <Input
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Search RM by name…"
      className="h-8 w-56 text-sm"
    />
  </div>
);

const CardShell: React.FC<{ className?: string; children: React.ReactNode; onClick?: () => void }> = ({
  className,
  children,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={cn(
      'rounded-xl border border-stone-200 bg-white p-4',
      onClick && 'cursor-pointer transition-colors hover:border-stone-400',
      className
    )}
  >
    {children}
  </div>
);

const Track: React.FC<{ fraction: number; className?: string }> = ({ fraction, className }) => (
  <div className="mt-2 h-1.5 w-full rounded-full bg-stone-200">
    <div
      className={cn('h-1.5 rounded-full bg-stone-700', className)}
      style={{ width: `${Math.min(Math.max(fraction, 0), 1) * 100}%` }}
    />
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  highlight?: 'amber' | 'green' | 'red';
  fraction?: number;
  onClick?: () => void;
}> = ({ label, value, sub, highlight, fraction, onClick }) => (
  <CardShell
    onClick={onClick}
    className={cn(
      highlight === 'amber' && 'border-amber-300 bg-amber-50/60',
      highlight === 'green' && 'border-emerald-200 bg-emerald-50/60',
      highlight === 'red' && 'border-red-200 bg-red-50/60'
    )}
  >
    <SectionLabel>{label}</SectionLabel>
    <div className="font-mono text-3xl font-semibold text-stone-900">{value}</div>
    {sub && <div className="mt-1 text-xs text-stone-400">{sub}</div>}
    {fraction !== undefined && <Track fraction={fraction} />}
  </CardShell>
);

// vs-target color: green when goal met, amber when close, red when badly missed
const vsTargetColor = (achieved: number, target: number) => {
  const pct = target === 0 ? 0 : achieved / target;
  if (pct >= 1) return 'text-emerald-700';
  if (pct >= 0.7) return 'text-amber-600';
  return 'text-red-600';
};

// disposition-time thresholds: stays its normal color under the SLA, turns red once breached
const timeColor = (seconds: number, threshold: number, underColor: string) =>
  seconds > threshold ? 'text-red-600' : underColor;

// ---- Performance tab ----

const PerformanceView: React.FC<{
  onDrill: (filter: DrillFilter) => void;
  teamTotals: ReturnType<typeof computeTeamTotals>;
  performanceByRm: RmPerformanceRow[];
  rmSearch: string;
  onRmSearchChange: (value: string) => void;
  onSelectRm: (rmUserId: string) => void;
  /** false in RM view — a one-row "By RM" table of just yourself is redundant with the cards above */
  showByRmTable: boolean;
  stateNameById: Record<string, string>;
}> = ({
  onDrill,
  teamTotals,
  performanceByRm,
  rmSearch,
  onRmSearchChange,
  onSelectRm,
  showByRmTable,
  stateNameById,
}) => {
  const achievedPct = teamTotals.target ? (teamTotals.achieved / teamTotals.target) * 100 : 0;

  return (
    <div className="space-y-6">
      <section>
        <SectionLabel>Outcome · Team Total</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Unique Leads Handled"
            value={teamTotals.uniqueLeadsHandled}
            sub={`${teamTotals.touches} touches`}
            onClick={() => onDrill('all')}
          />
          <StatCard
            label="Attempts per Lead"
            value={teamTotals.attemptsPerLead}
            sub="Touches ÷ unique"
            onClick={() => onDrill('all')}
          />
          <CardShell className="border-amber-300 bg-amber-50/60" onClick={() => onDrill('trial')}>
            <SectionLabel>Achieved vs Target</SectionLabel>
            <div className="font-mono text-3xl font-semibold">
              <span className="text-amber-700">{teamTotals.achieved}</span>
              <span className="text-stone-400"> / {teamTotals.target}</span>
            </div>
            <Track fraction={achievedPct / 100} className="bg-amber-600" />
            <div className="mt-1 flex justify-between text-xs text-stone-400">
              <span>{achievedPct.toFixed(1)}%</span>
              <span>Goal 100%</span>
            </div>
          </CardShell>
          <StatCard
            label="Trial Activation Rate"
            value={`${teamTotals.trialActivationRate}%`}
            sub={`${teamTotals.trialSubscribedRate.leads} of ${teamTotals.uniqueLeadsHandled}`}
            onClick={() => onDrill('trial')}
          />
        </div>
      </section>

      <section>
        <SectionLabel>Disposition Mix · Latest Disposition per Lead</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Not Connected Rate"
            value={`${teamTotals.notConnectedRate.rate}%`}
            sub={`${teamTotals.notConnectedRate.leads} leads`}
            fraction={teamTotals.notConnectedRate.rate / 100}
            onClick={() => onDrill('notConnected')}
          />
          <StatCard
            label="Call Back Rate"
            value={`${teamTotals.callBackRate.rate}%`}
            sub={`${teamTotals.callBackRate.leads} leads`}
            fraction={teamTotals.callBackRate.rate / 100}
            onClick={() => onDrill('callBack')}
          />
          <StatCard
            label="Not Interested Rate"
            value={`${teamTotals.notInterestedRate.rate}%`}
            sub={`${teamTotals.notInterestedRate.leads} leads`}
            fraction={teamTotals.notInterestedRate.rate / 100}
            onClick={() => onDrill('notInterested')}
          />
          <StatCard
            label="Trial Subscribed Rate"
            value={`${teamTotals.trialSubscribedRate.rate}%`}
            sub={`${teamTotals.trialSubscribedRate.leads} leads`}
            fraction={teamTotals.trialSubscribedRate.rate / 100}
            onClick={() => onDrill('trial')}
          />
        </div>
      </section>

      <p className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
        Each unique lead is classified by its most recent touch, so these four rates sum to 100%.
        Attempts per lead counts every touch, which is why it sits well above 1.
      </p>

      {showByRmTable && (
        <section>
          <RmTableHeader label="By RM" search={rmSearch} onSearchChange={onRmSearchChange} />
          <PerformanceTable rows={performanceByRm} onSelectRm={onSelectRm} stateNameById={stateNameById} />
        </section>
      )}
    </div>
  );
};

// The whole page scrolls in <main>, not just this table — so when the "By
// RM" search filters rows down (e.g. to just one match), the table's own
// height can drop far enough that main.scrollTop no longer fits the
// shrunk document, and the browser clamps it back up. That yanks the page
// (and the search box mid-keystroke) upward. Remembering the tallest
// height this table has actually rendered, and never reporting a smaller
// min-height, keeps a narrowing search from collapsing the page — it can
// still grow past that height later (e.g. search cleared), just never shrink.
function useStableMinHeight(deps: React.DependencyList) {
  const ref = useRef<HTMLTableElement>(null);
  const [minHeight, setMinHeight] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const height = ref.current.getBoundingClientRect().height;
    setMinHeight((prev) => Math.max(prev, height));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ref, minHeight };
}

// ---- "By RM" table column sorting (shared by the Performance and Adherence tables) ----

type SortDir = 'asc' | 'desc';
interface ColumnSort<K extends string> {
  key: K;
  dir: SortDir;
}

// `getValue` must be a stable (module-level, not inline-closure) function —
// it's a useMemo dep, and an inline closure would be a new reference every
// render, defeating the memo on every keystroke/re-render.
function useTableSort<T, K extends string>(rows: T[], getValue: (row: T, key: K) => string | number) {
  const [sort, setSort] = useState<ColumnSort<K> | null>(null);
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = getValue(a, sort.key);
      const bv = getValue(b, sort.key);
      if (typeof av === 'string' || typeof bv === 'string') {
        return String(av).localeCompare(String(bv)) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
  }, [rows, sort, getValue]);
  const toggleSort = (key: K) => {
    setSort((prev) => (!prev || prev.key !== key ? { key, dir: 'asc' } : { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }));
  };
  return { sortedRows, sort, toggleSort };
}

// Clickable column header: click to sort ascending, click again to flip to
// descending, click a different column to switch to it (ascending). Shows a
// muted up/down icon on every sortable column (discoverability — "this is
// clickable") and a solid arrow on whichever column is actually active.
function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: K;
  sort: ColumnSort<K> | null;
  onSort: (key: K) => void;
  align?: 'left' | 'right';
}) {
  const isActive = sort?.key === sortKey;
  return (
    <TableHead
      role="columnheader"
      aria-sort={isActive ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      tabIndex={0}
      onClick={() => onSort(sortKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(sortKey);
        }
      }}
      className={cn(
        'whitespace-nowrap text-white cursor-pointer select-none outline-none transition-colors hover:bg-white/10 focus-visible:bg-white/10',
        align === 'right' && 'text-right'
      )}
    >
      <span className={cn('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
        {label}
        {isActive ? (
          sort!.dir === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-stone-500" />
        )}
      </span>
    </TableHead>
  );
}

type PerfSortKey =
  | 'name'
  | 'uniqueLeads'
  | 'touches'
  | 'attemptsPerLead'
  | 'notConnectedRate'
  | 'callBackRate'
  | 'notInterestedRate'
  | 'trialRate'
  | 'achieved'
  | 'target'
  | 'vsTarget';

function performanceSortValue(row: RmPerformanceRow, key: PerfSortKey): string | number {
  switch (key) {
    case 'name':
      return row.name.toLowerCase();
    // no target set reads as "—", not 0% — sorts below every real ratio on
    // both asc and desc so it never masquerades as a 0% (missed) result
    case 'vsTarget':
      return row.target ? row.achieved / row.target : -Infinity;
    default:
      return row[key];
  }
}

const PerformanceTable: React.FC<{
  rows: RmPerformanceRow[];
  onSelectRm: (rmUserId: string) => void;
  stateNameById: Record<string, string>;
}> = ({ rows, onSelectRm, stateNameById }) => {
  const { ref, minHeight } = useStableMinHeight([rows.length]);
  const { sortedRows, sort, toggleSort } = useTableSort(rows, performanceSortValue);
  return (
  <div className="overflow-x-auto rounded-xl border border-stone-200" style={{ minHeight }}>
    <Table ref={ref} className="min-w-[920px]">
      <TableHeader>
        <TableRow className="border-none bg-stone-900 hover:bg-stone-900">
          <SortableHeader label="RM" sortKey="name" sort={sort} onSort={toggleSort} />
          <SortableHeader label="Unique Leads" sortKey="uniqueLeads" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Touches" sortKey="touches" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Att / Lead" sortKey="attemptsPerLead" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Not Conn" sortKey="notConnectedRate" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Call Back" sortKey="callBackRate" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Not Int" sortKey="notInterestedRate" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Trial" sortKey="trialRate" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Achieved" sortKey="achieved" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Target" sortKey="target" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="vs Target" sortKey="vsTarget" sort={sort} onSort={toggleSort} align="right" />
        </TableRow>
      </TableHeader>
      <TableBody className="bg-white">
        {sortedRows.map((row) => (
          <TableRow
            key={row.rmUserId}
            className="cursor-pointer hover:bg-stone-50"
            onClick={() => onSelectRm(row.rmUserId)}
          >
            <TableCell className="whitespace-nowrap">
              <div className="font-semibold text-stone-900">{row.name}</div>
              <div className="text-xs text-stone-400">
                {row.manager} · {row.team} · {stateNameById[row.state] || row.state}
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono underline decoration-stone-300">
              {row.uniqueLeads}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono">{row.touches}</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono">{row.attemptsPerLead.toFixed(2)}</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono underline decoration-stone-300">
              {row.notConnectedRate}%
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono underline decoration-stone-300">
              {row.callBackRate}%
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono">{row.notInterestedRate}%</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono font-semibold text-emerald-700">
              {row.trialRate}%
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono">{row.achieved}</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono text-stone-400">{row.target}</TableCell>
            <TableCell
              className={cn('whitespace-nowrap text-right font-mono font-semibold', vsTargetColor(row.achieved, row.target))}
            >
              {formatVsTarget(row.achieved, row.target)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
  );
};

// ---- Adherence tab ----

const AdherenceView: React.FC<{
  onDrill: (filter: DrillFilter) => void;
  shiftTimeAverages: ReturnType<typeof computeShiftTimeAverages>;
  achtOverall: ReturnType<typeof computeAchtOverall>;
  adherenceByRm: RmAdherenceRow[];
  rmSearch: string;
  onRmSearchChange: (value: string) => void;
  onSelectRm: (rmUserId: string) => void;
  /** false in RM view — a one-row "By RM" table of just yourself is redundant with the cards above */
  showByRmTable: boolean;
  stateNameById: Record<string, string>;
}> = ({
  onDrill,
  shiftTimeAverages,
  achtOverall,
  adherenceByRm,
  rmSearch,
  onRmSearchChange,
  onSelectRm,
  showByRmTable,
  stateNameById,
}) => (
  <div className="space-y-6">
    <section>
      <SectionLabel>Shift Time · Average per RM</SectionLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Login Hours"
          value={shiftTimeAverages.loginHours.value}
          sub={`Total   ${shiftTimeAverages.loginHours.total}`}
          onClick={() => onDrill('all')}
        />
        <StatCard
          label="Handling Time"
          value={shiftTimeAverages.handlingTime.value}
          sub={`Pace   ${shiftTimeAverages.handlingTime.pace}`}
          highlight="green"
          fraction={shiftTimeAverages.handlingTime.paceFraction}
          onClick={() => onDrill('all')}
        />
        <StatCard
          label="Break Time"
          value={shiftTimeAverages.breakTime.value}
          sub={`Off lead   ${shiftTimeAverages.breakTime.offLeadPct}%`}
        />
        <StatCard label="Occupancy" value={`${shiftTimeAverages.occupancy.value}%`} sub={shiftTimeAverages.occupancy.sub} />
        <StatCard
          label="Breaches >25m"
          value={shiftTimeAverages.breaches.value}
          sub={`${shiftTimeAverages.breaches.sub}   Review`}
          highlight="red"
          onClick={() => onDrill('breach')}
        />
      </div>
    </section>

    <section>
      <SectionLabel>Average Handling Time · Per Disposition</SectionLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="ACHT Overall"
          value={achtOverall.value}
          sub={`${achtOverall.touches} touches`}
          onClick={() => onDrill('all')}
        />
        <StatCard
          label="Not Connected"
          value={achtOverall.notConnected.value}
          sub={`${achtOverall.notConnected.touches} touches   ${achtOverall.notConnected.threshold}`}
          highlight="amber"
          fraction={achtOverall.notConnected.fraction}
          onClick={() => onDrill('notConnected')}
        />
        <StatCard
          label="Call Back"
          value={achtOverall.callBack.value}
          sub={`${achtOverall.callBack.touches} touches   ${achtOverall.callBack.threshold}`}
          highlight="amber"
          fraction={achtOverall.callBack.fraction}
          onClick={() => onDrill('callBack')}
        />
        <StatCard
          label="Not Interested"
          value={achtOverall.notInterested.value}
          sub={`${achtOverall.notInterested.touches} touches   ${achtOverall.notInterested.threshold}`}
          highlight="amber"
          fraction={achtOverall.notInterested.fraction}
          onClick={() => onDrill('notInterested')}
        />
        <StatCard
          label="Trial Subscribed"
          value={achtOverall.trial.value}
          sub={`${achtOverall.trial.touches} touches   ${achtOverall.trial.threshold}`}
          highlight="amber"
          fraction={achtOverall.trial.fraction}
          onClick={() => onDrill('trial')}
        />
      </div>
    </section>

    {showByRmTable && (
      <section>
        <RmTableHeader label="By RM" search={rmSearch} onSearchChange={onRmSearchChange} />
        <AdherenceTable rows={adherenceByRm} onSelectRm={onSelectRm} stateNameById={stateNameById} />
      </section>
    )}
  </div>
);

type AdherenceSortKey =
  | 'name'
  | 'status'
  | 'loginMinutes'
  | 'handlingMinutes'
  | 'breakMinutes'
  | 'occupancy'
  | 'touches'
  | 'achtSeconds'
  | 'notConnectedTime'
  | 'callBackTime'
  | 'notInterestedTime'
  | 'trialTime'
  | 'breaches';

function adherenceSortValue(row: RmAdherenceRow, key: AdherenceSortKey): string | number {
  switch (key) {
    case 'name':
      return row.name.toLowerCase();
    case 'status':
      return row.status;
    default:
      return row[key];
  }
}

const AdherenceTable: React.FC<{
  rows: RmAdherenceRow[];
  onSelectRm: (rmUserId: string) => void;
  stateNameById: Record<string, string>;
}> = ({ rows, onSelectRm, stateNameById }) => {
  const { ref, minHeight } = useStableMinHeight([rows.length]);
  const { sortedRows, sort, toggleSort } = useTableSort(rows, adherenceSortValue);
  return (
  <div className="overflow-x-auto rounded-xl border border-stone-200" style={{ minHeight }}>
    <Table ref={ref} className="min-w-[1180px]">
      <TableHeader>
        <TableRow className="border-none bg-stone-900 hover:bg-stone-900">
          <SortableHeader label="RM" sortKey="name" sort={sort} onSort={toggleSort} />
          <SortableHeader label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
          <SortableHeader label="Login" sortKey="loginMinutes" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Handling" sortKey="handlingMinutes" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Break" sortKey="breakMinutes" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Occ" sortKey="occupancy" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Touches" sortKey="touches" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="ACHT" sortKey="achtSeconds" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Not Conn" sortKey="notConnectedTime" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Call Back" sortKey="callBackTime" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Not Int" sortKey="notInterestedTime" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Trial" sortKey="trialTime" sort={sort} onSort={toggleSort} align="right" />
          <SortableHeader label="Breach" sortKey="breaches" sort={sort} onSort={toggleSort} align="right" />
        </TableRow>
      </TableHeader>
      <TableBody className="bg-white">
        {sortedRows.map((row) => (
          <TableRow
            key={row.rmUserId}
            className={cn('cursor-pointer hover:bg-stone-50', row.breaches > 0 && 'border-l-2 border-l-red-500')}
            onClick={() => onSelectRm(row.rmUserId)}
          >
            <TableCell className="whitespace-nowrap">
              <div className="font-semibold text-stone-900">{row.name}</div>
              <div className="text-xs text-stone-400">
                {row.manager} · {row.team} · {stateNameById[row.state] || row.state}
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    row.status === 'On lead' && 'bg-emerald-50 text-emerald-700',
                    row.status === 'Off lead' && 'bg-amber-50 text-amber-700',
                    row.status === 'Idle' && 'bg-stone-100 text-stone-500'
                  )}
                >
                  {row.status}
                </span>
                <span className={cn('text-xs', row.statusMinutes > 20 ? 'font-semibold text-red-600' : 'text-stone-400')}>
                  {row.statusMinutes}m
                </span>
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono">{row.loginHours}</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono">{row.handlingHours}</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono">{row.breakTime}</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono text-emerald-700">{row.occupancy}%</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono">{row.touches}</TableCell>
            <TableCell className="whitespace-nowrap text-right font-mono">{row.acht}</TableCell>
            <TableCell
              className={cn(
                'whitespace-nowrap text-right font-mono underline decoration-current/30',
                timeColor(row.notConnectedTime, achtThresholds.notConnected, 'text-emerald-700')
              )}
            >
              {row.notConnectedLabel}
            </TableCell>
            <TableCell
              className={cn(
                'whitespace-nowrap text-right font-mono underline decoration-current/30',
                timeColor(row.callBackTime, achtThresholds.callBack, 'text-amber-700')
              )}
            >
              {row.callBackLabel}
            </TableCell>
            <TableCell
              className={cn('whitespace-nowrap text-right font-mono', timeColor(row.notInterestedTime, achtThresholds.notInterested, 'text-amber-700'))}
            >
              {row.notInterestedLabel}
            </TableCell>
            <TableCell className={cn('whitespace-nowrap text-right font-mono', timeColor(row.trialTime, achtThresholds.trial, 'text-amber-700'))}>
              {row.trialLabel}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right">
              {row.breaches > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-red-600 px-1 font-mono text-xs font-semibold text-white">
                  {row.breaches}
                </span>
              ) : (
                <span className="font-mono text-stone-300">0</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
  );
};

// ---- RM detail modal ----
// Opened by clicking a row in either "By RM" table. Same cards as the team
// view (Outcome, Disposition Mix, Shift Time, ACHT), just fed this one RM's
// own events — clicking a card opens the same touch report, scoped to them.

const RmDetailModal: React.FC<{
  open: boolean;
  onClose: () => void;
  profile: RmActivityEvent | undefined;
  teamTotals: ReturnType<typeof computeTeamTotals>;
  shiftTimeAverages: ReturnType<typeof computeShiftTimeAverages>;
  achtOverall: ReturnType<typeof computeAchtOverall>;
  onDrill: (filter: DrillFilter) => void;
  stateNameById: Record<string, string>;
}> = ({ open, onClose, profile, teamTotals, shiftTimeAverages, achtOverall, onDrill, stateNameById }) => {
  const achievedPct = teamTotals.target ? (teamTotals.achieved / teamTotals.target) * 100 : 0;
  const stateName = profile ? stateNameById[profile.state] || profile.state : '';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{profile?.rmName ?? 'RM'}</DialogTitle>
          <DialogDescription>
            {profile ? `${profile.managerName} · ${profile.team} · ${stateName}` : 'No activity in this date range'}
          </DialogDescription>
        </DialogHeader>

        {profile && (
          <div className="space-y-6">
            <section>
              <SectionLabel>Outcome</SectionLabel>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Unique Leads Handled"
                  value={teamTotals.uniqueLeadsHandled}
                  sub={`${teamTotals.touches} touches`}
                  onClick={() => onDrill('all')}
                />
                <StatCard
                  label="Attempts per Lead"
                  value={teamTotals.attemptsPerLead}
                  sub="Touches ÷ unique"
                  onClick={() => onDrill('all')}
                />
                <CardShell className="border-amber-300 bg-amber-50/60" onClick={() => onDrill('trial')}>
                  <SectionLabel>Achieved vs Target</SectionLabel>
                  <div className="font-mono text-3xl font-semibold">
                    <span className="text-amber-700">{teamTotals.achieved}</span>
                    <span className="text-stone-400"> / {teamTotals.target}</span>
                  </div>
                  <Track fraction={achievedPct / 100} className="bg-amber-600" />
                </CardShell>
                <StatCard
                  label="Trial Activation Rate"
                  value={`${teamTotals.trialActivationRate}%`}
                  sub={`${teamTotals.trialSubscribedRate.leads} of ${teamTotals.uniqueLeadsHandled}`}
                  onClick={() => onDrill('trial')}
                />
              </div>
            </section>

            <section>
              <SectionLabel>Disposition Mix</SectionLabel>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Not Connected Rate"
                  value={`${teamTotals.notConnectedRate.rate}%`}
                  sub={`${teamTotals.notConnectedRate.leads} leads`}
                  fraction={teamTotals.notConnectedRate.rate / 100}
                  onClick={() => onDrill('notConnected')}
                />
                <StatCard
                  label="Call Back Rate"
                  value={`${teamTotals.callBackRate.rate}%`}
                  sub={`${teamTotals.callBackRate.leads} leads`}
                  fraction={teamTotals.callBackRate.rate / 100}
                  onClick={() => onDrill('callBack')}
                />
                <StatCard
                  label="Not Interested Rate"
                  value={`${teamTotals.notInterestedRate.rate}%`}
                  sub={`${teamTotals.notInterestedRate.leads} leads`}
                  fraction={teamTotals.notInterestedRate.rate / 100}
                  onClick={() => onDrill('notInterested')}
                />
                <StatCard
                  label="Trial Subscribed Rate"
                  value={`${teamTotals.trialSubscribedRate.rate}%`}
                  sub={`${teamTotals.trialSubscribedRate.leads} leads`}
                  fraction={teamTotals.trialSubscribedRate.rate / 100}
                  onClick={() => onDrill('trial')}
                />
              </div>
            </section>

            <section>
              <SectionLabel>Shift Time</SectionLabel>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatCard
                  label="Login Hours"
                  value={shiftTimeAverages.loginHours.value}
                  onClick={() => onDrill('all')}
                />
                <StatCard
                  label="Handling Time"
                  value={shiftTimeAverages.handlingTime.value}
                  sub={`Pace   ${shiftTimeAverages.handlingTime.pace}`}
                  highlight="green"
                  fraction={shiftTimeAverages.handlingTime.paceFraction}
                  onClick={() => onDrill('all')}
                />
                <StatCard
                  label="Break Time"
                  value={shiftTimeAverages.breakTime.value}
                  sub={`Off lead   ${shiftTimeAverages.breakTime.offLeadPct}%`}
                />
                <StatCard label="Occupancy" value={`${shiftTimeAverages.occupancy.value}%`} sub={shiftTimeAverages.occupancy.sub} />
                <StatCard
                  label="Breaches >25m"
                  value={shiftTimeAverages.breaches.value}
                  highlight="red"
                  onClick={() => onDrill('breach')}
                />
              </div>
            </section>

            <section>
              <SectionLabel>Average Handling Time · Per Status</SectionLabel>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatCard label="ACHT Overall" value={achtOverall.value} sub={`${achtOverall.touches} touches`} onClick={() => onDrill('all')} />
                <StatCard
                  label="Not Connected"
                  value={achtOverall.notConnected.value}
                  sub={`${achtOverall.notConnected.touches} touches`}
                  highlight="amber"
                  fraction={achtOverall.notConnected.fraction}
                  onClick={() => onDrill('notConnected')}
                />
                <StatCard
                  label="Call Back"
                  value={achtOverall.callBack.value}
                  sub={`${achtOverall.callBack.touches} touches`}
                  highlight="amber"
                  fraction={achtOverall.callBack.fraction}
                  onClick={() => onDrill('callBack')}
                />
                <StatCard
                  label="Not Interested"
                  value={achtOverall.notInterested.value}
                  sub={`${achtOverall.notInterested.touches} touches`}
                  highlight="amber"
                  fraction={achtOverall.notInterested.fraction}
                  onClick={() => onDrill('notInterested')}
                />
                <StatCard
                  label="Trial Subscribed"
                  value={achtOverall.trial.value}
                  sub={`${achtOverall.trial.touches} touches`}
                  highlight="amber"
                  fraction={achtOverall.trial.fraction}
                  onClick={() => onDrill('trial')}
                />
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
