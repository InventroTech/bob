'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bell, ChevronRight, FileText, Loader2, Search, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useMobileBackStack } from '@/hooks/useMobileBackStack';
import type { DispatchCardListConfig } from './DispatchCardListComponent';
import {
  DispatchRecordsPanel,
  type DispatchRecordsPanelHandle,
} from './dispatch/DispatchRecordsPanel';
import { fetchDistinctFieldValues } from './dispatch/fetchDistinctFieldValues';
import { DispatchSalesChartCard, DispatchStatsTiles } from './dispatch/DispatchDashboardStatsCard';
import {
  fetchDispatchDashboardStats,
  type DispatchDashboardStats,
} from './dispatch/fetchDispatchDashboardStats';
import { DispatchFilterIcon } from './dispatch/DispatchFilterIcon';

export type DispatchDashboardConfig = {
  entityType?: string;
  customerField?: string;
  engineerField?: string;
  hidePageHeader?: boolean;
  listConfig?: DispatchCardListConfig;
  homeTitle?: string;
  homeSubtitle?: string;
  groupByCustomerLabel?: string;
  lastTenLabel?: string;
  lastTenSubtitle?: string;
};

type DashboardView = 'home' | 'customers' | 'customerRecords' | 'recentRecords';

interface DispatchDashboardProps {
  config?: DispatchDashboardConfig;
}

function getProfileName(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return 'User';
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User'
  );
}

export const DispatchDashboardComponent: React.FC<DispatchDashboardProps> = ({ config }) => {
  const { user } = useAuth();
  const entityType = config?.entityType ?? config?.listConfig?.entityType ?? 'dispatch_request';
  const customerField = config?.customerField ?? 'account_name';
  const engineerField = config?.engineerField ?? 'engineer';
  const listConfig = config?.listConfig;
  const homeTitle = config?.homeTitle ?? 'Sales Dashboard';
  const homeSubtitle = config?.homeSubtitle ?? 'Track performance for';
  const groupLabel = config?.groupByCustomerLabel ?? 'Client List';
  const lastTenLabel = config?.lastTenLabel ?? 'Recently Opened';
  const lastTenSubtitle = config?.lastTenSubtitle ?? 'Last 10 Dispatches';

  const [view, setView] = useState<DashboardView>('home');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customers, setCustomers] = useState<string[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [homeSearch, setHomeSearch] = useState('');
  const [stats, setStats] = useState<DispatchDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [engineers, setEngineers] = useState<string[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState('');

  const recordsPanelRef = useRef<DispatchRecordsPanelHandle>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const profileName = getProfileName(user);
  const profileImage =
    user?.user_metadata?.picture || user?.user_metadata?.avatar_url || '/default-avatar.png';

  const { pushOverlay, closeOverlay, consumeBackNavigation, onPopState } = useMobileBackStack();

  const customerLockedParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCustomer) {
      params.set(customerField, selectedCustomer);
    }
    return params;
  }, [selectedCustomer, customerField]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const values = await fetchDistinctFieldValues(entityType, customerField);
      setCustomers(values);
    } catch (err) {
      console.error('[DispatchDashboard] failed to load customers', err);
      toast.error('Failed to load customers');
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, [entityType, customerField]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await fetchDispatchDashboardStats(entityType, customerField, {
        engineerField,
        engineerFilter: selectedEngineer || undefined,
      });
      setStats(data);
      setCustomers(data.customers);
    } catch (err) {
      console.error('[DispatchDashboard] failed to load stats', err);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [entityType, customerField, engineerField, selectedEngineer]);

  useEffect(() => {
    let cancelled = false;
    fetchDistinctFieldValues(entityType, engineerField)
      .then((values) => {
        if (!cancelled) setEngineers(values);
      })
      .catch(() => {
        if (!cancelled) setEngineers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, engineerField]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (view === 'customers' && customers.length === 0 && !customersLoading && !statsLoading) {
      loadCustomers();
    }
  }, [view, customers.length, customersLoading, statsLoading, loadCustomers]);

  const navigateForward = useCallback(
    (next: DashboardView) => {
      setView(next);
      pushOverlay('dispatchNav');
    },
    [pushOverlay]
  );

  const navigateBack = useCallback(
    (prev: DashboardView) => {
      setView(prev);
      closeOverlay('dispatchNav');
    },
    [closeOverlay]
  );

  const popViewFromHistory = useCallback(() => {
    const current = viewRef.current;
    if (current === 'customerRecords') {
      setView('customers');
      setSelectedCustomer('');
      return;
    }
    if (current === 'recentRecords' || current === 'customers') {
      setView('home');
      setSelectedCustomer('');
    }
  }, []);

  useEffect(() => {
    return onPopState(() => {
      if (recordsPanelRef.current?.handlePopState()) {
        return;
      }
      const overlay = consumeBackNavigation();
      if (overlay === 'dispatchNav') {
        popViewFromHistory();
      }
    });
  }, [onPopState, consumeBackNavigation, popViewFromHistory]);

  const handleHomeSearch = () => {
    const q = homeSearch.trim();
    if (q) {
      setCustomerSearch(q);
    }
    navigateForward('customers');
  };

  if (view === 'customerRecords') {
    return (
      <DispatchRecordsPanel
        ref={recordsPanelRef}
        config={listConfig}
        panelTitle={selectedCustomer}
        showListHeading
        showYearBlock={false}
        showBackButton
        titleSentenceCase
        lockedQueryParams={customerLockedParams}
        onBack={() => navigateBack('customers')}
      />
    );
  }

  if (view === 'recentRecords') {
    return (
      <DispatchRecordsPanel
        ref={recordsPanelRef}
        config={listConfig}
        panelTitle={lastTenLabel}
        showListHeading
        showYearBlock={false}
        showBackButton
        showSort={false}
        groupByDate
        fixedPageSize={10}
        disableLoadMore
        initialSortId="updated_desc"
        onBack={() => navigateBack('home')}
      />
    );
  }

  if (view === 'customers') {
    return (
      <div className="relative mx-auto min-h-[calc(100dvh-56px)] max-w-lg bg-[#F7F7F8] md:max-w-2xl">
        <div className="px-4 pb-2 pt-4">
          <button
            type="button"
            onClick={() => navigateBack('home')}
            className="mb-3 flex items-center gap-1 text-sm font-medium text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Client List</h1>
        </div>

        <div className="flex items-center gap-2 px-4 pb-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search"
              className="w-full rounded-full border border-[#E8ECEF] bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
            />
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E8ECEF] bg-white"
            aria-label="Filter"
          >
            <DispatchFilterIcon />
          </button>
        </div>

        <div className="space-y-2 px-4 pb-8">
          {customersLoading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
              <p className="mt-2 text-sm text-gray-500">Loading clients…</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No clients found.</p>
          ) : (
            filteredCustomers.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setSelectedCustomer(name);
                  navigateForward('customerRecords');
                }}
                className="flex w-full items-center justify-between rounded-xl border border-[#7c3aed]/35 bg-white px-4 py-3.5 text-left transition active:scale-[0.99]"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{name}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-56px)] max-w-lg flex-col bg-[#F7F7F8] md:max-w-2xl">
      <div className="flex h-full min-h-0 flex-col gap-4 px-4 py-4">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-500">Welcome back,</p>
            <p className="truncate text-xl font-bold text-gray-900">{profileName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#E8ECEF] bg-white"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-gray-700" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <img
              src={profileImage}
              alt={profileName}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
            />
          </div>
        </div>

        <DispatchSalesChartCard
          title={homeTitle}
          subtitle={homeSubtitle}
          stats={stats}
          loading={statsLoading}
          engineers={engineers}
          selectedEngineer={selectedEngineer}
          onEngineerChange={setSelectedEngineer}
          className="shrink-0"
        />

        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={homeSearch}
            onChange={(e) => setHomeSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleHomeSearch();
            }}
            placeholder="Search"
            className="w-full rounded-full border border-[#E8ECEF] bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
          />
        </div>

        <DispatchStatsTiles stats={stats} loading={statsLoading} className="shrink-0" />

        <div className="grid shrink-0 grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigateForward('customers')}
            className="flex flex-col rounded-xl border border-[#E8ECEF] bg-white p-3 text-left transition active:scale-[0.99]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
              <Users className="h-4 w-4 text-orange-500" />
            </span>
            <span className="mt-2 text-sm font-bold text-gray-900">{groupLabel}</span>
            <div className="mt-0.5 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Browse by Account</span>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateForward('recentRecords')}
            className="relative flex flex-col rounded-xl border border-[#E8ECEF] bg-white p-3 text-left transition active:scale-[0.99]"
          >
            <Share2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
              <FileText className="h-4 w-4 text-sky-600" />
            </span>
            <span className="mt-2 text-sm font-bold text-gray-900">{lastTenLabel}</span>
            <span className="mt-0.5 text-[11px] text-gray-500">{lastTenSubtitle}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
