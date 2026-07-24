'use client';

import { getRecordModalTitleParts, type RecordModalTitleInput } from '@/lib/recordModalHeader';

type RecordModalTitleDisplayProps = {
  record: RecordModalTitleInput | null | undefined;
};

/**
 * Readable modal header: Request Number | Item · Date (24 July 2026).
 */
export function RecordModalTitleDisplay({ record }: RecordModalTitleDisplayProps) {
  const parts = getRecordModalTitleParts(record);

  if (!parts) {
    return <span className="text-lg font-semibold text-muted-foreground sm:text-xl">Record</span>;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <span
        className="inline-flex shrink-0 items-center rounded-md bg-muted px-2 py-0.5 font-mono text-[13px] font-medium tabular-nums tracking-tight text-muted-foreground"
        title="Request Number"
      >
        #{parts.idNum}
      </span>

      <span className="select-none text-border" aria-hidden>
        |
      </span>

      <span
        className="min-w-0 text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg"
        title={parts.itemName === '—' ? undefined : parts.itemName}
      >
        <span className="line-clamp-2 break-words">{parts.itemName}</span>
      </span>

      <span className="select-none text-border/80" aria-hidden>
        ·
      </span>

      <time
        className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground"
        dateTime={parts.dateTimeAttr}
        title="Requested Date"
      >
        {parts.dateDisplay}
      </time>
    </div>
  );
}
