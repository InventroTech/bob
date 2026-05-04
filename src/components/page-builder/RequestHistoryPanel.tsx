import * as React from 'react';
import { ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PRICE_FIELD_KEYS, formatPriceFieldRead } from '@/lib/currencyFormat';

export type RequestHistoryActor = {
  label?: string | null;
  email?: string | null;
  name?: string | null;
} | null;

export type RequestHistoryEntry = {
  id: number;
  action: string;
  version: number;
  created_at: string;
  actor?: RequestHistoryActor;
  changes?: Record<string, unknown> | null;
};

/** Never show these top-level history keys (internal / redundant). */
const HIDDEN_TOP_LEVEL_KEYS = new Set(['tenant_id', 'entity_type']);

/** Never show these keys inside `data` payloads. */
const HIDDEN_DATA_KEYS = new Set(['requester_id', 'tenant_id', 'entity_type']);

/** Prefer this order for `data` summary; remaining keys follow alphabetically. */
const DATA_DISPLAY_ORDER: string[] = [
  'item_name_freeform',
  'status',
  'status_text',
  'vendor',
  'department',
  'urgency_level',
  'quantity_required',
  'estimated_cost',
  'final_amount',
  'extra_charges',
  'price_currency',
  'product_link',
  'additional_link',
  'tracking_link',
  'request_date',
  'eta',
  'team_lead',
  'including_gst',
  'consolidation',
  'comments',
  'cart_id',
  'requester_name',
];

const LINKISH_DATA_KEYS = new Set([
  'product_link',
  'tracking_link',
  'additional_link',
  'vendor_link',
  'link',
]);

function humanizeFieldKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isFromToPair(val: unknown): val is { from: unknown; to: unknown } {
  if (val === null || typeof val !== 'object' || Array.isArray(val)) return false;
  return 'from' in val && 'to' in val;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function stringifyForHistory(value: unknown, indent = 2): string {
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return String(value);
  }
}

function formatScalarForDisplay(fieldKey: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (PRICE_FIELD_KEYS.has(fieldKey)) {
    return formatPriceFieldRead(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  return stringifyForHistory(value, 0);
}

function formatValueForHistory(fieldKey: string, value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    return stringifyForHistory(value);
  }
  return formatScalarForDisplay(fieldKey, value);
}

function formatCommentsSummary(comments: unknown): string {
  if (!Array.isArray(comments) || comments.length === 0) return '—';
  return comments
    .map((c) => {
      if (c && typeof c === 'object' && 'comment' in c) {
        const o = c as Record<string, unknown>;
        const name = String(o.name ?? '').trim();
        const role = String(o.role ?? '').trim();
        const text = String(o.comment ?? '').trim();
        if (!text && !name) return null;
        if (role) return `${name || 'Someone'} (${role}): ${text || '—'}`;
        return `${name || 'Someone'}: ${text || '—'}`;
      }
      return String(c);
    })
    .filter(Boolean)
    .join('\n');
}

function formatDataValueNode(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  if (key === 'comments') {
    const text = formatCommentsSummary(value);
    if (text === '—') return <span className="text-muted-foreground">—</span>;
    return (
      <span className="whitespace-pre-wrap break-words">
        {text.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <br /> : null}
            {line}
          </React.Fragment>
        ))}
      </span>
    );
  }
  if (typeof value === 'string') {
    if ((LINKISH_DATA_KEYS.has(key) || /^https?:\/\//i.test(value)) && /^https?:\/\//i.test(value.trim())) {
      const href = value.trim();
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline break-all">
          {href}
        </a>
      );
    }
    return <span className="break-words">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return <span>{value ? 'Yes' : 'No'}</span>;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (PRICE_FIELD_KEYS.has(key)) {
      return <span>{formatPriceFieldRead(value)}</span>;
    }
    return <span>{String(value)}</span>;
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    return <span className="font-mono text-xs opacity-90">{stringifyForHistory(value)}</span>;
  }
  return <span className="break-words">{String(value)}</span>;
}

function getOrderedDataEntries(data: Record<string, unknown>): Array<[string, unknown]> {
  const keys = Object.keys(data).filter((k) => !HIDDEN_DATA_KEYS.has(k));
  const orderIndex = (k: string) => {
    const i = DATA_DISPLAY_ORDER.indexOf(k);
    return i === -1 ? 999 : i;
  };
  keys.sort((a, b) => {
    const da = orderIndex(a);
    const db = orderIndex(b);
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });
  return keys.map((k) => [k, data[k]]);
}

function DataSnapshotSummary({ data }: { data: Record<string, unknown> }) {
  const entries = getOrderedDataEntries(data).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No details to show.</p>;
  }

  return (
    <dl className="space-y-2.5 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="grid gap-1 border-b border-border/40 pb-2 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,32%)_1fr] sm:gap-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{humanizeFieldKey(k)}</dt>
          <dd className="min-w-0 text-foreground">{formatDataValueNode(k, v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function shallowDataFieldDiff(
  from: Record<string, unknown>,
  to: Record<string, unknown>,
): Array<{ key: string; from: unknown; to: unknown }> {
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
  const rows: Array<{ key: string; from: unknown; to: unknown }> = [];
  for (const k of keys) {
    if (HIDDEN_DATA_KEYS.has(k)) continue;
    const a = from[k];
    const b = to[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    rows.push({ key: k, from: a, to: b });
  }
  rows.sort((r1, r2) => {
    const i1 = DATA_DISPLAY_ORDER.indexOf(r1.key);
    const i2 = DATA_DISPLAY_ORDER.indexOf(r2.key);
    const o1 = i1 === -1 ? 999 : i1;
    const o2 = i2 === -1 ? 999 : i2;
    if (o1 !== o2) return o1 - o2;
    return r1.key.localeCompare(r2.key);
  });
  return rows;
}

function StatusStepLine({ prev, cur, by }: { prev: string; cur: string; by: string }) {
  return (
    <li className="rounded-md border border-border/50 bg-muted/30 px-2.5 py-2 text-sm">
      <span className="font-medium text-foreground">{prev || '—'}</span>
      <span className="mx-1.5 text-muted-foreground">→</span>
      <span className="font-medium text-foreground">{cur || '—'}</span>
      {by ? <span className="mt-1 block text-xs text-muted-foreground">by {by}</span> : null}
    </li>
  );
}

function parseStatusRows(arr: unknown): Array<{ prev: string; cur: string; by: string }> {
  if (!Array.isArray(arr)) return [];
  return arr.map((row) => {
    if (!row || typeof row !== 'object') return { prev: '', cur: '', by: '' };
    const o = row as Record<string, unknown>;
    return {
      prev: String(o.previous_status ?? ''),
      cur: String(o.current_status ?? ''),
      by: String(o.changed_by ?? ''),
    };
  });
}

function StatusStepsList({ value }: { value: unknown }) {
  const rows = parseStatusRows(Array.isArray(value) ? value : []);
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((s, i) => (
        <StatusStepLine key={`${s.prev}-${s.cur}-${i}`} prev={s.prev} cur={s.cur} by={s.by} />
      ))}
    </ul>
  );
}

function LongValue({ text, variant }: { text: string; variant: 'from' | 'to' }) {
  const [expanded, setExpanded] = React.useState(false);
  const threshold = 220;
  const lineCount = text.split('\n').length;
  const needsToggle = text.length > threshold || lineCount > 6;

  const baseClass = cn(
    'rounded-md px-2 py-1.5 text-sm font-mono leading-snug break-all whitespace-pre-wrap',
    variant === 'from' &&
      'bg-muted/80 text-muted-foreground line-through decoration-muted-foreground/50',
    variant === 'to' && 'bg-primary/8 text-foreground ring-1 ring-primary/15',
  );

  const displayText =
    expanded || !needsToggle ? text : `${text.slice(0, threshold).trimEnd()}${text.length > threshold ? '…' : ''}`;

  return (
    <div className="w-full min-w-0 space-y-1">
      <div className={cn(baseClass, !expanded && needsToggle && 'max-h-32 overflow-hidden')}>{displayText}</div>
      {needsToggle ? (
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Show less' : 'Show full value'}
        </button>
      ) : null}
    </div>
  );
}

function ChangeRow({ fieldKey, from, to }: { fieldKey: string; from: unknown; to: unknown }) {
  const label = humanizeFieldKey(fieldKey);
  const fromText = formatValueForHistory(fieldKey, from);
  const toText = formatValueForHistory(fieldKey, to);

  return (
    <div className="rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 shadow-sm">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground">Before</div>
          <LongValue text={fromText} variant="from" />
        </div>
        <div className="flex shrink-0 items-center justify-center pt-5 text-muted-foreground sm:pt-7">
          <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground">After</div>
          <LongValue text={toText} variant="to" />
        </div>
      </div>
    </div>
  );
}

function DataChangeBlock({ from, to }: { from: unknown; to: unknown }) {
  const fromEmpty = from == null || (isPlainObject(from) && Object.keys(from).length === 0);
  const toObj = isPlainObject(to) ? to : null;

  if (toObj && fromEmpty) {
    return (
      <div className="rounded-lg border border-border/50 bg-background/60 px-3 py-3 shadow-sm">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Request details</div>
        <p className="mb-3 text-xs text-muted-foreground">Values saved when this record was created (internal IDs hidden).</p>
        <DataSnapshotSummary data={toObj} />
      </div>
    );
  }

  if (toObj && isPlainObject(from)) {
    const diff = shallowDataFieldDiff(from, toObj);
    if (diff.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No visible field changes in request data.</p>
      );
    }
    return (
      <div className="space-y-3">
        {diff.map((row) => (
          <div key={row.key} className="rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 shadow-sm">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {humanizeFieldKey(row.key)}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground">Before</div>
                <div className="rounded-md bg-muted/80 px-2 py-1.5 text-sm text-muted-foreground">{formatDataValueNode(row.key, row.from)}</div>
              </div>
              <div className="flex shrink-0 items-center justify-center pt-5 text-muted-foreground sm:pt-7">
                <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground">After</div>
                <div className="rounded-md bg-primary/8 px-2 py-1.5 text-sm ring-1 ring-primary/15">{formatDataValueNode(row.key, row.to)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <ChangeRow fieldKey="data" from={from} to={to} />;
}

function StatusesChangeBlock({ from, to }: { from: unknown; to: unknown }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 shadow-sm">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status history</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground">Before</div>
          <div className="rounded-md bg-muted/50 px-2 py-2">
            <StatusStepsList value={from} />
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-center pt-5 text-muted-foreground sm:pt-7">
          <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground">After</div>
          <div className="rounded-md bg-primary/5 px-2 py-2 ring-1 ring-primary/10">
            <StatusStepsList value={to} />
          </div>
        </div>
      </div>
    </div>
  );
}

function renderChangeRow(key: string, from: unknown, to: unknown): React.ReactNode {
  if (key === 'data') {
    return <DataChangeBlock from={from} to={to} />;
  }
  if (key === 'statuses') {
    return <StatusesChangeBlock from={from} to={to} />;
  }
  return <ChangeRow fieldKey={key} from={from} to={to} />;
}

function actionBadgeProps(action: string): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string } {
  const a = action.toLowerCase();
  if (a === 'created') {
    return {
      variant: 'outline',
      className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
    };
  }
  if (a === 'deleted') {
    return { variant: 'destructive' };
  }
  if (a === 'updated') {
    return {
      variant: 'outline',
      className: 'border-primary/30 bg-primary/5 text-foreground',
    };
  }
  return { variant: 'secondary' };
}

export type RequestHistoryPanelProps = {
  loading: boolean;
  error: string | null;
  entries: RequestHistoryEntry[];
};

export function RequestHistoryPanel({ loading, error, entries }: RequestHistoryPanelProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading history…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No history entries found.</p>;
  }

  return (
    <div className="relative space-y-4 pl-1">
      <div className="absolute bottom-2 left-[11px] top-2 w-px bg-border/80" aria-hidden />
      {entries.map((entry) => {
        const actor = entry.actor?.name || entry.actor?.email || entry.actor?.label || 'System';
        const rawChanges = entry.changes && typeof entry.changes === 'object' ? entry.changes : null;
        const pairs: Array<{ key: string; from: unknown; to: unknown }> = [];
        if (rawChanges) {
          for (const [key, val] of Object.entries(rawChanges)) {
            if (HIDDEN_TOP_LEVEL_KEYS.has(key)) continue;
            if (isFromToPair(val)) {
              pairs.push({ key, from: val.from, to: val.to });
            }
          }
        }
        const badge = actionBadgeProps(entry.action);

        return (
          <article
            key={entry.id}
            className="relative ml-5 rounded-xl border border-border/70 bg-gradient-to-b from-card to-card/95 pl-4 pr-3 py-3 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
          >
            <div
              className="absolute -left-[21px] top-5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary shadow"
              aria-hidden
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={badge.variant} className={cn('capitalize', badge.className)}>
                  {entry.action}
                </Badge>
                <span className="text-xs font-medium text-muted-foreground">v{entry.version}</span>
                <span className="text-sm text-foreground">
                  <span className="text-muted-foreground">by</span> {actor}
                </span>
              </div>
              <time className="text-xs tabular-nums text-muted-foreground sm:text-right">
                {entry.created_at ? new Date(entry.created_at).toLocaleString() : 'Unknown time'}
              </time>
            </div>

            {pairs.length > 0 ? (
              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Changes ({pairs.length})</h4>
                <div className="space-y-2">
                  {pairs.map((p) => (
                    <React.Fragment key={p.key}>{renderChangeRow(p.key, p.from, p.to)}</React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No field-level diff for this entry (e.g. system-only or legacy row).
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
