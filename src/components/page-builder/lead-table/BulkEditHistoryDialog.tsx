/** Bulk Edit history popup for request tables. */

import React, { useCallback, useEffect, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  bulkEditActorLabel,
  fetchBulkEditHistory,
  summarizeBulkEditTargets,
  type BulkEditHistoryEntry,
} from '@/lib/inventory/bulkEditHistory';
import { getRequestStatusLabel } from '@/lib/inventory/requestStatus';
import { getInventoryStatusToneClass } from '@/lib/inventory/statusStyles';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiClient: Pick<AxiosInstance, 'get'>;
  entityType?: string | null;
};

function formatWhen(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp || '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusChip({ value, entityType }: { value: string; entityType?: string | null }) {
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        getInventoryStatusToneClass(value, entityType)
      )}
    >
      {getRequestStatusLabel(value, entityType)}
    </span>
  );
}

export function BulkEditHistoryDialog({ open, onOpenChange, apiClient, entityType }: Props) {
  const [entries, setEntries] = useState<BulkEditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await fetchBulkEditHistory(apiClient, entityType));
    } catch (err) {
      console.warn('[bulk-edit-history] load failed', err);
      setError('Could not load bulk edit history.');
    } finally {
      setLoading(false);
    }
  }, [apiClient, entityType]);

  useEffect(() => {
    if (open) {
      setExpanded(new Set());
      void load();
    }
  }, [open, load]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl overflow-hidden border-0 p-0">
        <DialogHeader className="space-y-0 bg-[#0E3777] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-bold uppercase tracking-wide text-white">
            Bulk edit history
          </DialogTitle>
          <DialogDescription className="sr-only">Past bulk status changes on this table</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto px-6 pb-6 pt-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-red-600">{error}</p>
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No bulk edits yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
              {entries.map((entry) => {
                const isOpen = expanded.has(entry.id);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => toggle(entry.id)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      {isOpen ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                          <span className="font-semibold text-gray-900">{bulkEditActorLabel(entry.actor)}</span>
                          <span className="text-gray-600">
                            changed {entry.count} request{entry.count === 1 ? '' : 's'}
                          </span>
                          <span className="ml-auto whitespace-nowrap text-xs text-gray-500">
                            {formatWhen(entry.timestamp)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {summarizeBulkEditTargets(entry.changes).map(({ to, count }) => (
                            <span key={to} className="inline-flex items-center gap-1 text-xs text-gray-600">
                              {count} →
                              <StatusChip value={to} entityType={entityType} />
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                    {isOpen ? (
                      <table className="w-full border-t border-gray-100 bg-gray-50/60 text-sm">
                        <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-4 py-2 pl-11 font-semibold">Item</th>
                            <th className="px-3 py-2 font-semibold">From</th>
                            <th className="px-3 py-2 font-semibold">To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.changes.map((change) => (
                            <tr key={`${entry.id}-${change.record_id}`} className="border-t border-gray-100">
                              <td
                                className="max-w-[18rem] truncate px-4 py-2 pl-11 text-gray-800"
                                title={change.item}
                              >
                                {change.item || `Request #${change.record_id}`}
                              </td>
                              <td className="px-3 py-2">
                                <StatusChip value={change.from} entityType={entityType} />
                              </td>
                              <td className="px-3 py-2">
                                <StatusChip value={change.to} entityType={entityType} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
