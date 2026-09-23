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
import { useRmFilterOptions, type RmFilterOptions } from './rm-prd-analytics/useRmFilterOptions';
import { daysInRange, filterByDateRange, resolveDateRange } from './rm-prd-analytics/dateRange';
import { TouchReportSheet } from './rm-prd-analytics/TouchReportSheet';
import type { DrillFilter } from './rm-prd-analytics/touchData';
import type { RmActivityEvent } from './rm-prd-analytics/types';

export interface RmPrdAnalyticsConfig {
  title?: string;
}

interface RmPrdAnalyticsComponentProps {
  config?: RmPrdAnalyticsConfig;
}

type Tab = 'performance' | 'adherence';

// no leadBucket filter: buckets are pipeline-pull slices, never a field on a
// lead touch, so there's nothing real for it to match (see RmPrdFilterOptionsView)
const DEFAULT_FILTERS = {
  manager: 'All managers',
  dateRange: 'Today',
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
// Manager/state/party/date-range all filter visibleEvents (see below); there
// is deliberately no Lead Bucket filter — see DEFAULT_FILTERS.
export const RmPrdAnalyticsComponent: React.FC<RmPrdAnalyticsComponentProps> = ({ config }) => {
  const { options: filterOptions } = useRmFilterOptions();
  const { targets: dailyTargets } = useRmDailyTargets();
  const [tab, setTab] = useState<Tab>(loadStoredTab);
  const [filters, setFilters] = useState<Filters>(loadStoredFilters);
  const [drill, setDrill] = useState<DrillFilter | null>(null);
  // when the touch report was opened from inside an RM's own detail modal,
  // this scopes it to just that RM instead of every visible RM
  const [drillRmUserId, setDrillRmUserId] = useState<string | null>(null);
  const [rmSearch, setRmSearch] = useState('');
  const [selectedRmUserId, setSelectedRmUserId] = useState<string | null>(null);

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

  const dateBounds = useMemo(
    () => resolveDateRange(filters.dateRange, filters.customFrom, filters.customTo),
    [filters.dateRange, filters.customFrom, filters.customTo]
  );
  // a per-RM target is a *daily* goal — scale it up to however many
  // calendar days the selected range actually covers (1 for Today/Yesterday)
  const rangeDays = useMemo(() => daysInRange(dateBounds), [dateBounds]);
  // windows the fetch itself to this range (see useRmActivityEvents) — not
  // just a client-side filter over the whole tenant table anymore
  const { events, loading, error } = useRmActivityEvents(dateBounds);
  const visibleEvents = useMemo(() => {
    let result = filterByDateRange(events, dateBounds);
    if (filters.manager !== 'All managers') result = result.filter((e) => e.managerName === filters.manager);
    // state/party only apply to CALL_TOUCH rows (LOGIN/LOGOUT/BREAK_* rows
    // don't carry a lead's state/party) — filtering the whole event stream
    // by them would silently drop real break/login rows and corrupt the
    // login/break/occupancy numbers whenever a state or party filter is active
    if (filters.state !== 'All states') {
      result = result.filter((e) => e.eventType !== 'CALL_TOUCH' || e.state === filters.state);
    }
    if (filters.party !== 'All parties') {
      result = result.filter((e) => e.eventType !== 'CALL_TOUCH' || e.party === filters.party);
    }
    return result;
  }, [events, dateBounds, filters.manager, filters.state, filters.party]);

  const performanceByRm = useMemo(
    () => computePerformanceByRm(visibleEvents, dailyTargets, rangeDays),
    [visibleEvents, dailyTargets, rangeDays]
  );
  const adherenceByRm = useMemo(() => computeAdherenceByRm(visibleEvents), [visibleEvents]);
  const teamTotals = useMemo(
    () => computeTeamTotals(visibleEvents, dailyTargets, rangeDays),
    [visibleEvents, dailyTargets, rangeDays]
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
    () => computeTeamTotals(selectedRmEvents, dailyTargets, rangeDays),
    [selectedRmEvents, dailyTargets, rangeDays]
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
      {config?.title && (
        <h2 className="mb-4 text-lg font-semibold text-stone-900">{config.title}</h2>
      )}

      <FilterBar
        filters={filters}
        filterOptions={filterOptions}
        onChange={setFilter}
        onReset={() => setFilters(DEFAULT_FILTERS)}
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
      />

      <TouchReportSheet
        events={touchReportEvents}
        filter={drill}
        scopeLabel={drillRmUserId ? selectedRmProfile?.rmName : undefined}
        onClose={() => {
          setDrill(null);
          setDrillRmUserId(null);
        }}
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
}> = ({ filters, filterOptions, onChange, onReset }) => {
  const fields: Array<{ key: keyof Filters; label: string; options: string[] }> = [
    { key: 'manager', label: 'Manager', options: filterOptions.managers },
    { key: 'dateRange', label: 'Date Range', options: filterOptions.dateRanges },
    { key: 'state', label: 'State', options: filterOptions.states },
    { key: 'party', label: 'Party', options: filterOptions.parties },
  ];

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
                <SelectItem key={option} value={option}>
                  {option}
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
}> = ({ onDrill, teamTotals, performanceByRm, rmSearch, onRmSearchChange, onSelectRm }) => {
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

      <section>
        <RmTableHeader label="By RM" search={rmSearch} onSearchChange={onRmSearchChange} />
        <PerformanceTable rows={performanceByRm} onSelectRm={onSelectRm} />
      </section>
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

const PerformanceTable: React.FC<{ rows: RmPerformanceRow[]; onSelectRm: (rmUserId: string) => void }> = ({
  rows,
  onSelectRm,
}) => {
  const { ref, minHeight } = useStableMinHeight([rows.length]);
  return (
  <div className="overflow-x-auto rounded-xl border border-stone-200" style={{ minHeight }}>
    <Table ref={ref} className="min-w-[920px]">
      <TableHeader>
        <TableRow className="border-none bg-stone-900 hover:bg-stone-900">
          <TableHead className="whitespace-nowrap text-white">RM</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Unique Leads</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Touches</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Att / Lead</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Not Conn</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Call Back</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Not Int</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Trial</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Achieved</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Target</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">vs Target</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="bg-white">
        {rows.map((row) => (
          <TableRow
            key={row.rmUserId}
            className="cursor-pointer hover:bg-stone-50"
            onClick={() => onSelectRm(row.rmUserId)}
          >
            <TableCell className="whitespace-nowrap">
              <div className="font-semibold text-stone-900">{row.name}</div>
              <div className="text-xs text-stone-400">
                {row.manager} · {row.team} · {row.state}
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
}> = ({ onDrill, shiftTimeAverages, achtOverall, adherenceByRm, rmSearch, onRmSearchChange, onSelectRm }) => (
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

    <section>
      <RmTableHeader label="By RM" search={rmSearch} onSearchChange={onRmSearchChange} />
      <AdherenceTable rows={adherenceByRm} onSelectRm={onSelectRm} />
    </section>
  </div>
);

const AdherenceTable: React.FC<{ rows: RmAdherenceRow[]; onSelectRm: (rmUserId: string) => void }> = ({
  rows,
  onSelectRm,
}) => {
  const { ref, minHeight } = useStableMinHeight([rows.length]);
  return (
  <div className="overflow-x-auto rounded-xl border border-stone-200" style={{ minHeight }}>
    <Table ref={ref} className="min-w-[1180px]">
      <TableHeader>
        <TableRow className="border-none bg-stone-900 hover:bg-stone-900">
          <TableHead className="whitespace-nowrap text-white">RM</TableHead>
          <TableHead className="whitespace-nowrap text-white">Status</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Login</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Handling</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Break</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Occ</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Touches</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">ACHT</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Not Conn</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Call Back</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Not Int</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Trial</TableHead>
          <TableHead className="whitespace-nowrap text-right text-white">Breach</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="bg-white">
        {rows.map((row) => (
          <TableRow
            key={row.rmUserId}
            className={cn('cursor-pointer hover:bg-stone-50', row.breaches > 0 && 'border-l-2 border-l-red-500')}
            onClick={() => onSelectRm(row.rmUserId)}
          >
            <TableCell className="whitespace-nowrap">
              <div className="font-semibold text-stone-900">{row.name}</div>
              <div className="text-xs text-stone-400">
                {row.manager} · {row.team} · {row.state}
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
}> = ({ open, onClose, profile, teamTotals, shiftTimeAverages, achtOverall, onDrill }) => {
  const achievedPct = teamTotals.target ? (teamTotals.achieved / teamTotals.target) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{profile?.rmName ?? 'RM'}</DialogTitle>
          <DialogDescription>
            {profile ? `${profile.managerName} · ${profile.team} · ${profile.state}` : 'No activity in this date range'}
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
