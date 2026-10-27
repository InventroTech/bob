/**
 * Bulk Edit history for request tables.
 *
 * Each Confirm & Save logs one EventLog row via POST /crm-records/records/events/
 * (attached to the first changed record) and the history list reads them back with
 * GET /crm-records/events/?event=<entity>.bulk_status_update (newest first).
 */

import type { AxiosInstance } from 'axios';

export type BulkEditChange = {
  record_id: string;
  item: string;
  from: string;
  to: string;
};

export type BulkEditActor = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

export type BulkEditPayload = {
  batch_id: string;
  entity_type: string | null;
  field: string;
  count: number;
  actor: BulkEditActor;
  changes: BulkEditChange[];
};

export type BulkEditHistoryEntry = BulkEditPayload & {
  id: string;
  timestamp: string;
};

export function bulkEditEventName(entityType?: string | null): string {
  return `${entityType || 'request'}.bulk_status_update`;
}

function newBatchId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildBulkEditPayload(params: {
  entityType?: string | null;
  field?: string;
  actor?: BulkEditActor | null;
  changes: BulkEditChange[];
}): BulkEditPayload {
  const changes = params.changes.filter((c) => c.record_id);
  return {
    batch_id: newBatchId(),
    entity_type: params.entityType ?? null,
    field: params.field || 'status',
    count: changes.length,
    actor: {
      id: params.actor?.id ?? null,
      email: params.actor?.email ?? null,
      name: params.actor?.name ?? null,
    },
    changes,
  };
}

/** Log one bulk edit. Never throws — history must not block the save. */
export async function logBulkEdit(
  apiClient: Pick<AxiosInstance, 'post'>,
  payload: BulkEditPayload
): Promise<boolean> {
  const first = payload.changes[0];
  if (!first) return false;
  const recordId = Number(first.record_id);
  try {
    await apiClient.post('/crm-records/records/events/', {
      record_id: Number.isFinite(recordId) ? recordId : first.record_id,
      event: bulkEditEventName(payload.entity_type),
      payload,
    });
    return true;
  } catch (err) {
    console.warn('[bulk-edit-history] failed to log bulk edit', err);
    return false;
  }
}

function toEntry(raw: any): BulkEditHistoryEntry | null {
  const payload = raw?.payload;
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.changes)) return null;
  const changes: BulkEditChange[] = payload.changes
    .filter((c: any) => c && c.record_id != null)
    .map((c: any) => ({
      record_id: String(c.record_id),
      item: String(c.item ?? ''),
      from: String(c.from ?? ''),
      to: String(c.to ?? ''),
    }));
  return {
    id: String(raw.id ?? payload.batch_id ?? ''),
    timestamp: String(raw.timestamp ?? ''),
    batch_id: String(payload.batch_id ?? raw.id ?? ''),
    entity_type: payload.entity_type ?? null,
    field: String(payload.field || 'status'),
    count: typeof payload.count === 'number' ? payload.count : changes.length,
    actor: {
      id: payload.actor?.id ?? null,
      email: payload.actor?.email ?? null,
      name: payload.actor?.name ?? null,
    },
    changes,
  };
}

export function parseBulkEditHistory(data: unknown): BulkEditHistoryEntry[] {
  const obj = data as { data?: unknown; results?: unknown } | unknown[] | null;
  const list = Array.isArray(obj)
    ? obj
    : Array.isArray((obj as any)?.data)
      ? (obj as any).data
      : Array.isArray((obj as any)?.results)
        ? (obj as any).results
        : [];
  return (list as unknown[])
    .map(toEntry)
    .filter((e): e is BulkEditHistoryEntry => e != null);
}

export async function fetchBulkEditHistory(
  apiClient: Pick<AxiosInstance, 'get'>,
  entityType?: string | null,
  pageSize = 50
): Promise<BulkEditHistoryEntry[]> {
  const res = await apiClient.get('/crm-records/events/', {
    params: { event: bulkEditEventName(entityType), page_size: pageSize },
  });
  return parseBulkEditHistory(res.data);
}

/** "3 → Ordered, 1 → In cart" style counts per target value. */
export function summarizeBulkEditTargets(changes: BulkEditChange[]): Array<{ to: string; count: number }> {
  const counts = new Map<string, number>();
  for (const c of changes) counts.set(c.to, (counts.get(c.to) ?? 0) + 1);
  return Array.from(counts, ([to, count]) => ({ to, count })).sort((a, b) => b.count - a.count);
}

export function bulkEditActorLabel(actor: BulkEditActor | null | undefined): string {
  const name = String(actor?.name ?? '').trim();
  if (name) return name;
  const email = String(actor?.email ?? '').trim();
  return email || 'Unknown user';
}
