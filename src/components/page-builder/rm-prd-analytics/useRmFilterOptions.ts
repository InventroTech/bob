import { useEffect, useState } from 'react';
import { rmActivityApi } from '@/lib/api/services/rmActivity';

export interface RmFilterOptions {
  managers: string[];
  dateRanges: string[];
  states: string[];
  parties: string[];
}

// Date range is the only dropdown that isn't a property of any database
// row, so it stays a fixed list — everything else comes from the backend.
const DATE_RANGES = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Custom'];

const EMPTY: RmFilterOptions = {
  managers: ['All managers'],
  dateRanges: DATE_RANGES,
  states: ['All states'],
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
          states: ['All states', ...dto.states],
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
