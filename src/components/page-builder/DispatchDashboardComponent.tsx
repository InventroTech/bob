'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Building2, ChevronRight, Clock, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useMobileBackStack } from '@/hooks/useMobileBackStack';
import type { DispatchCardListConfig } from './DispatchCardListComponent';
import {
  DispatchRecordsPanel,
  type DispatchRecordsPanelHandle,
} from './dispatch/DispatchRecordsPanel';
import { fetchDistinctFieldValues } from './dispatch/fetchDistinctFieldValues';
import { DispatchDashboardStatsCard } from './dispatch/DispatchDashboardStatsCard';
import {
  fetchDispatchDashboardStats,
  type DispatchDashboardStats,
} from './dispatch/fetchDispatchDashboardStats';

export type DispatchDashboardConfig = {
  entityType?: string;
  customerField?: string;
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

export const DispatchDashboardComponent: React.FC<DispatchDashboardProps> = ({ config }) => {
  const entityType = config?.entityType ?? config?.listConfig?.entityType ?? 'dispatch_request';
  const customerField = config?.customerField ?? 'account_name';
  const listConfig = config?.listConfig;
  const homeTitle = config?.homeTitle ?? 'Dispatch Dashboard';
  const homeSubtitle = config?.homeSubtitle ?? 'Track and browse dispatch data';
  const groupLabel = config?.groupByCustomerLabel ?? 'Group by customer';
  const lastTenLabel = config?.lastTenLabel ?? 'Last 10 dispatch';
  const lastTenSubtitle = config?.lastTenSubtitle ?? 'Most recently updated';

  const [view, setView] = useState<DashboardView>('home');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customers, setCustomers] = useState<string[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [stats, setStats] = useState<DispatchDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const recordsPanelRef = useRef<DispatchRecordsPanelHandle>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

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

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    fetchDispatchDashboardStats(entityType, customerField)
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setCustomers(data.customers);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[DispatchDashboard] failed to load stats', err);
        setStats(null);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, customerField]);

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

  if (view === 'customerRecords') {
    return (
      <DispatchRecordsPanel
        ref={recordsPanelRef}
        config={listConfig}
        panelTitle={selectedCustomer}
        showListHeading
        showYearBlock={false}
        showBackButton
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
        showFilters={false}
        fixedPageSize={10}
        disableLoadMore
        initialSortId="updated_desc"
        onBack={() => navigateBack('home')}
      />
    );
  }

  if (view === 'customers') {
    return (
      <div className="relative mx-auto min-h-[calc(100dvh-56px)] max-w-lg bg-[#f3f4f6] md:max-w-2xl">
        <div className="px-4 pb-4 pt-4">
          <button
            type="button"
            onClick={() => navigateBack('home')}
            className="mb-3 flex items-center gap-1 text-sm font-medium text-[#1e3a5f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-xl font-bold text-[#1e3a5f]">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">Select a customer to view dispatch data</p>
          <input
            type="search"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search customers"
            className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
          />
        </div>
        <div className="space-y-2 px-4 pb-8">
          {customersLoading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
              <p className="mt-2 text-sm text-gray-500">Loading customers…</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No customers found.</p>
          ) : (
            filteredCustomers.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setSelectedCustomer(name);
                  navigateForward('customerRecords');
                }}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-[#7c3aed]/40 bg-white p-4 text-left shadow-[0_2px_12px_rgba(124,58,237,0.15)] transition active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]/10">
                  <Building2 className="h-5 w-5 text-[#7c3aed]" />
                </span>
                <span className="min-w-0 flex-1 line-clamp-2 text-sm font-bold uppercase leading-snug text-gray-900">
                  {name}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-56px)] max-w-lg flex-col bg-[#f3f4f6] md:max-w-2xl">
      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
        <div className="mb-4 grid shrink-0 grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigateForward('customers')}
            className="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Users className="h-5 w-5 text-orange-500" />
            </span>
            <span className="mt-3 text-sm font-bold text-gray-900">{groupLabel}</span>
            <span className="mt-1 text-xs text-gray-500">Browse by account</span>
          </button>

          <button
            type="button"
            onClick={() => navigateForward('recentRecords')}
            className="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
              <Clock className="h-5 w-5 text-sky-600" />
            </span>
            <span className="mt-3 text-sm font-bold text-gray-900">{lastTenLabel}</span>
            <span className="mt-1 text-xs text-gray-500">{lastTenSubtitle}</span>
          </button>
        </div>

        <DispatchDashboardStatsCard
          title={homeTitle}
          subtitle={homeSubtitle}
          stats={stats}
          loading={statsLoading}
        />
      </div>
    </div>
  );
};
