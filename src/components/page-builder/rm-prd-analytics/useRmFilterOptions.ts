import { useEffect, useState } from 'react';
import { rmActivityApi } from '@/lib/api/services/rmActivity';

export interface RmStateFilterOption {
  value: string;
  label: string;
}

export interface RmFilterOptions {
  managers: string[];
  dateRanges: string[];
  leadGroups: string[];
  // value is the raw Circle ID (matches RmActivityEvent.state); label is
  // the resolved Circle name — see stateNameById for resolving that same
  // ID anywhere else it's displayed (By RM table, RM detail, touch report)
  states: RmStateFilterOption[];
  parties: string[];
}

// Date range is the only dropdown that isn't a property of any database
// row, so it stays a fixed list — everything else comes from the backend.
const DATE_RANGES = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Custom'];

const ALL_STATES_OPTION: RmStateFilterOption = { value: 'All states', label: 'All states' };

const EMPTY: RmFilterOptions = {
  managers: ['All managers'],
  dateRanges: DATE_RANGES,
  leadGroups: ['All groups'],
  states: [ALL_STATES_OPTION],
  parties: ['All parties'],
};

export function useRmFilterOptions() {
  const [options, setOptions] = useState<RmFilterOptions>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    rmActivityApi
      .getFilterOptions()
      .then((dto) => {
        if (cancelled) return;
        setOptions({
          managers: ['All managers', ...dto.managers],
          dateRanges: DATE_RANGES,
          leadGroups: ['All groups', ...dto.lead_groups],
          states: [ALL_STATES_OPTION, ...dto.states],
          parties: ['All parties', ...dto.parties],
        });
      })
      .catch(() => {
        // filter bar just falls back to "All ___" only — not worth a
        // separate error state for a dropdown
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading };
}

/** Raw Circle state ID -> resolved name, for any place besides the filter
 * dropdown that displays an RmActivityEvent's own `state` field as text
 * (e.g. the "By RM" table row, RM detail header, touch report column). */
export function stateNameLookup(states: RmStateFilterOption[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const { value, label } of states) {
    map[value] = label;
  }
  return map;
}
