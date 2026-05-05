'use client';

import { getRecordModalTitleParts, type RecordModalTitleInput } from '@/lib/recordModalHeader';

type RecordModalTitleDisplayProps = {
  record: RecordModalTitleInput | null | undefined;
};

/**
 * Readable modal header: request # (chip), item name (emphasis), date (muted).
 */
export function RecordModalTitleDisplay({ record }: RecordModalTitleDisplayProps) {
  const parts = getRecordModalTitleParts(record);

  if (!parts) {
    return <span className="text-lg font-semibold text-muted-foreground sm:text-xl">Record</span>;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4 sm:gap-y-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-2">
        <span
          className="inline-flex w-fit shrink-0 items-center rounded-md border border-border/80 bg-muted/50 px-2.5 py-1 text-sm font-semibold tabular-nums tracking-tight text-muted-foreground shadow-sm"
          title="Request number"
        >
          #{parts.idNum}
        </span>
        <span
          className="min-w-0 max-w-full text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl"
          title={parts.itemName === '—' ? undefined : parts.itemName}
        >
          <span className="line-clamp-3 break-words">{parts.itemName}</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-border/60 pt-2 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
        <time
          className="text-sm font-medium tabular-nums text-muted-foreground sm:text-base"
          dateTime={parts.dateTimeAttr}
          title="Date"
        >
          {parts.dateDisplay}
        </time>
      </div>
    </div>
  );
}
