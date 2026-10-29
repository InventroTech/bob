import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { DISPOSITIONS, DRILL_TITLES, generateTouches, type DrillFilter, type TouchRow } from './touchData';
import type { RmActivityEvent } from './types';
import { useTableSort, SortableHeader } from './tableSort';

type TouchSortKey =
  | 'touchId'
  | 'prajaId'
  | 'rmName'
  | 'manager'
  | 'state'
  | 'party'
  | 'group'
  | 'openedFrom'
  | 'disposition'
  | 'reason'
  | 'start'
  | 'end'
  | 'duration'
  | 'flag';

function touchSortValue(row: TouchRow, key: TouchSortKey): string | number {
  switch (key) {
    case 'touchId':
      return row.touchId;
    case 'prajaId':
      return row.prajaId ?? '';
    case 'rmName':
      return row.rmName.toLowerCase();
    case 'manager':
      return row.manager.toLowerCase();
    case 'state':
      return row.state.toLowerCase();
    case 'party':
      return row.party.toLowerCase();
    case 'group':
      return row.group.toLowerCase();
    case 'openedFrom':
      return row.openedFrom.toLowerCase();
    case 'disposition':
      return DISPOSITIONS[row.dispositionKey].full;
    case 'reason':
      return row.reason.toLowerCase();
    case 'start':
      return row.startedAtMs;
    case 'end':
      return row.endedAtMs;
    // null (unknown duration) sorts to the low end regardless of direction,
    // rather than crashing the comparator or silently sorting as "0s"
    case 'duration':
      return row.durationSeconds ?? -1;
    // sorts by the same text the badge actually shows (the disposition
    // label) — a non-breached row has no badge at all, so it sorts as ''
    case 'flag':
      return row.isBreach ? DISPOSITIONS[row.dispositionKey].label.toLowerCase() : '';
  }
}

const CSV_COLUMNS: Array<{ header: string; value: (row: TouchRow) => string | number }> = [
  { header: 'Touch ID', value: (r) => r.touchId },
  { header: 'Praja ID', value: (r) => r.prajaId ?? '' },
  { header: 'RM', value: (r) => r.rmName },
  { header: 'Manager', value: (r) => r.manager },
  { header: 'State', value: (r) => r.state },
  { header: 'Party', value: (r) => r.party },
  { header: 'Group', value: (r) => r.group },
  { header: 'Opened From', value: (r) => r.openedFrom },
  { header: 'Disposition', value: (r) => DISPOSITIONS[r.dispositionKey].full },
  { header: 'Reason', value: (r) => r.reason },
  { header: 'Start (IST)', value: (r) => r.start },
  { header: 'End (IST)', value: (r) => r.end },
  { header: 'Duration (s)', value: (r) => r.durationSeconds ?? 'Unknown' },
  { header: 'Breach', value: (r) => (r.isBreach ? 'Y' : '') },
];

// wraps a field in quotes only when it needs escaping, per RFC 4180
const csvCell = (value: string | number): string => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const slugifyTitle = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'touch-report';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadTouchReportCsv(rows: TouchRow[], title: string) {
  const lines = [
    CSV_COLUMNS.map((col) => csvCell(col.header)).join(','),
    ...rows.map((row) => CSV_COLUMNS.map((col) => csvCell(col.value(row))).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${slugifyTitle(title)}-${new Date().toISOString().slice(0, 10)}.csv`);
}

// Real .xlsx (not a renamed CSV) — same CSV_COLUMNS header/value pairs, just
// written through SheetJS instead of joined into a comma-separated string.
// Only ever writes rows we already hold in memory (never parses a file), so
// this doesn't exercise the known xlsx-package advisories, which are in its
// read/parse path.
function downloadTouchReportExcel(rows: TouchRow[], title: string) {
  const header = CSV_COLUMNS.map((col) => col.header);
  const data = rows.map((row) => CSV_COLUMNS.map((col) => col.value(row)));
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Touch Report');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `${slugifyTitle(title)}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

interface TouchReportSheetProps {
  events: RmActivityEvent[];
  filter: DrillFilter | null;
  /** Set when opened from one RM's own detail modal — shows that RM's name
   * instead of the default "All visible RMs" description. */
  scopeLabel?: string;
  onClose: () => void;
  /** raw Circle state ID -> resolved name, for the "State" column/CSV export */
  stateNameById: Record<string, string>;
}

// Drill-down table opened by clicking a stat card — one row per touch,
// scoped to whichever disposition (or breach) the card represents.
export const TouchReportSheet: React.FC<TouchReportSheetProps> = ({
  events,
  filter,
  scopeLabel,
  onClose,
  stateNameById,
}) => {
  const rows = useMemo(
    () => (filter ? generateTouches(events, filter, stateNameById) : []),
    [events, filter, stateNameById]
  );
  const { sortedRows, sort, toggleSort } = useTableSort(rows, touchSortValue);

  return (
    <Sheet open={filter !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-[min(1100px,94vw)] max-w-none flex-col gap-0 p-0 sm:max-w-[min(1100px,94vw)]"
      >
        <SheetHeader className="border-b border-stone-200 px-6 py-5 text-left">
          <SheetTitle>{filter ? DRILL_TITLES[filter] : 'Touch report'}</SheetTitle>
          <SheetDescription>{scopeLabel ?? 'All visible RMs'}</SheetDescription>
        </SheetHeader>

        <div className="min-w-0 flex-1 overflow-auto px-6 py-4">
          <Table className="min-w-[1080px] text-sm">
            <TableHeader>
              <TableRow className="border-none bg-stone-900 hover:bg-stone-900">
                <SortableHeader label="Touch ID" sortKey="touchId" sort={sort} onSort={toggleSort} />
                <SortableHeader label="Praja ID" sortKey="prajaId" sort={sort} onSort={toggleSort} />
                <SortableHeader label="RM" sortKey="rmName" sort={sort} onSort={toggleSort} />
                <SortableHeader label="Manager" sortKey="manager" sort={sort} onSort={toggleSort} />
                <SortableHeader label="State" sortKey="state" sort={sort} onSort={toggleSort} />
                <SortableHeader label="Party" sortKey="party" sort={sort} onSort={toggleSort} />
                <SortableHeader label="Group" sortKey="group" sort={sort} onSort={toggleSort} />
                <SortableHeader label="Opened From" sortKey="openedFrom" sort={sort} onSort={toggleSort} />
                <SortableHeader label="Disposition" sortKey="disposition" sort={sort} onSort={toggleSort} />
                <SortableHeader label="Reason" sortKey="reason" sort={sort} onSort={toggleSort} />
                <SortableHeader label="Start" sortKey="start" sort={sort} onSort={toggleSort} align="right" />
                <SortableHeader label="End" sortKey="end" sort={sort} onSort={toggleSort} align="right" />
                <SortableHeader label="Duration" sortKey="duration" sort={sort} onSort={toggleSort} align="right" />
                <SortableHeader label="Flag" sortKey="flag" sort={sort} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {sortedRows.map((row) => {
                return (
                  <TableRow key={row.touchId}>
                    <TableCell className="whitespace-nowrap font-mono">{row.touchId}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono">{row.prajaId ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-stone-900">{row.rmName}</TableCell>
                    <TableCell className="whitespace-nowrap text-stone-500">{row.manager}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.state}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.party}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{row.group}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-stone-500">{row.openedFrom || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-xs font-medium',
                          row.dispositionKey === 'trial' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
                        )}
                      >
                        {DISPOSITIONS[row.dispositionKey].full}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-stone-500" title={row.reason || undefined}>
                      {row.reason || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono">{row.start}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono">{row.end}</TableCell>
                    <TableCell className={cn('whitespace-nowrap text-right font-mono', row.isBreach && 'font-semibold text-red-600')}>
                      {row.durationLabel}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.isBreach && (
                        <span className="whitespace-nowrap rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                          {DISPOSITIONS[row.dispositionKey].label} &gt;{row.breachThresholdLabel}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center gap-3 border-t border-stone-200 px-6 py-4 text-sm text-stone-500">
          <span>{rows.length} rows · one row per touch</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              disabled={rows.length === 0}
              onClick={() => downloadTouchReportCsv(sortedRows, filter ? DRILL_TITLES[filter] : 'touch-report')}
            >
              Download CSV
            </Button>
            <Button
              variant="outline"
              disabled={rows.length === 0}
              onClick={() => downloadTouchReportExcel(sortedRows, filter ? DRILL_TITLES[filter] : 'touch-report')}
            >
              Download Excel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
