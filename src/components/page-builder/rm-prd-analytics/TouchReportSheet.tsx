import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { BREACH_SECONDS, DISPOSITIONS, DRILL_TITLES, generateTouches, type DrillFilter, type TouchRow } from './touchData';
import type { RmActivityEvent } from './types';

const CSV_COLUMNS: Array<{ header: string; value: (row: TouchRow) => string | number }> = [
  { header: 'Touch ID', value: (r) => r.touchId },
  { header: 'Lead ID', value: (r) => r.leadId ?? '' },
  { header: 'RM', value: (r) => r.rmName },
  { header: 'Manager', value: (r) => r.manager },
  { header: 'State', value: (r) => r.state },
  { header: 'Party', value: (r) => r.party },
  { header: 'Bucket', value: (r) => r.bucket },
  { header: 'Disposition', value: (r) => DISPOSITIONS[r.dispositionKey].full },
  { header: 'Reason', value: (r) => r.reason },
  { header: 'Start (IST)', value: (r) => r.start },
  { header: 'End (IST)', value: (r) => r.end },
  { header: 'Duration (s)', value: (r) => r.durationSeconds },
  { header: 'Over 25m', value: (r) => (r.durationSeconds >= BREACH_SECONDS ? 'Y' : '') },
];

// wraps a field in quotes only when it needs escaping, per RFC 4180
const csvCell = (value: string | number): string => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function downloadTouchReportCsv(rows: TouchRow[], title: string) {
  const lines = [
    CSV_COLUMNS.map((col) => csvCell(col.header)).join(','),
    ...rows.map((row) => CSV_COLUMNS.map((col) => csvCell(col.value(row))).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  link.href = url;
  link.download = `${slug || 'touch-report'}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface TouchReportSheetProps {
  events: RmActivityEvent[];
  filter: DrillFilter | null;
  /** Set when opened from one RM's own detail modal — shows that RM's name
   * instead of the default "All visible RMs" description. */
  scopeLabel?: string;
  onClose: () => void;
}

// Drill-down table opened by clicking a stat card — one row per touch,
// scoped to whichever disposition (or breach) the card represents.
export const TouchReportSheet: React.FC<TouchReportSheetProps> = ({ events, filter, scopeLabel, onClose }) => {
  const rows = useMemo(() => (filter ? generateTouches(events, filter) : []), [events, filter]);

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
                <TableHead className="whitespace-nowrap text-white">Touch ID</TableHead>
                <TableHead className="whitespace-nowrap text-white">Lead ID</TableHead>
                <TableHead className="whitespace-nowrap text-white">RM</TableHead>
                <TableHead className="whitespace-nowrap text-white">Manager</TableHead>
                <TableHead className="whitespace-nowrap text-white">State</TableHead>
                <TableHead className="whitespace-nowrap text-white">Party</TableHead>
                <TableHead className="whitespace-nowrap text-white">Bucket</TableHead>
                <TableHead className="whitespace-nowrap text-white">Disposition</TableHead>
                <TableHead className="text-white">Reason</TableHead>
                <TableHead className="whitespace-nowrap text-right text-white">Start</TableHead>
                <TableHead className="whitespace-nowrap text-right text-white">End</TableHead>
                <TableHead className="whitespace-nowrap text-right text-white">Duration</TableHead>
                <TableHead className="whitespace-nowrap text-white">Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {rows.map((row) => {
                const over25 = row.durationSeconds >= BREACH_SECONDS;
                return (
                  <TableRow key={row.touchId}>
                    <TableCell className="whitespace-nowrap font-mono">{row.touchId}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono">{row.leadId ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-stone-900">{row.rmName}</TableCell>
                    <TableCell className="whitespace-nowrap text-stone-500">{row.manager}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.state}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.party}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{row.bucket}</span>
                    </TableCell>
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
                    <TableCell className={cn('whitespace-nowrap text-right font-mono', over25 && 'font-semibold text-red-600')}>
                      {row.durationLabel}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {over25 && (
                        <span className="whitespace-nowrap rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                          OVER 25m
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
          <Button
            variant="outline"
            className="ml-auto"
            disabled={rows.length === 0}
            onClick={() => downloadTouchReportCsv(rows, filter ? DRILL_TITLES[filter] : 'touch-report')}
          >
            Download CSV
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
