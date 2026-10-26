/** Shared click-to-sort column header, used by every "By RM" and drill-down
 * table on the RM PRD page (PerformanceTable, AdherenceTable, TouchReportSheet)
 * so they all sort and look the same way. */
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type SortDir = 'asc' | 'desc';
export interface ColumnSort<K extends string> {
  key: K;
  dir: SortDir;
}

// `getValue` must be a stable (module-level, not inline-closure) function —
// it's a useMemo dep, and an inline closure would be a new reference every
// render, defeating the memo on every keystroke/re-render.
export function useTableSort<T, K extends string>(rows: T[], getValue: (row: T, key: K) => string | number) {
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
export function SortableHeader<K extends string>({
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
        // bg-stone-900 is painted here, per cell, rather than left to the
        // parent TableRow alone — inside a Sheet/Dialog (a transformed
        // ancestor, from the slide-in animation), browsers can fail to
        // paint a <tr>'s background under its first cell, leaving that
        // header's white text invisible against the unpainted background.
        // Painting each cell's own background sidesteps that regardless of
        // which ancestor is transformed.
        'whitespace-nowrap bg-stone-900 text-white cursor-pointer select-none outline-none transition-colors hover:bg-white/10 focus-visible:bg-white/10',
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
