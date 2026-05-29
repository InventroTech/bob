import React, { useMemo } from 'react';
import { ArrowUpDown, Check, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  DEFAULT_DISPATCH_SORT_ID,
  DISPATCH_SORT_OPTIONS,
  type DispatchSortOption,
} from './dispatchSort';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftSortId: string;
  onDraftSortIdChange: (id: string) => void;
  onApply: () => void;
  onReset: () => void;
};

function groupOptions(options: DispatchSortOption[]) {
  const sections: DispatchSortOption['section'][] = ['Date', 'Name & reference', 'System'];
  return sections
    .map((section) => ({
      section,
      items: options.filter((o) => o.section === section),
    }))
    .filter((g) => g.items.length > 0);
}

export const DispatchSortSheet: React.FC<Props> = ({
  open,
  onOpenChange,
  draftSortId,
  onDraftSortIdChange,
  onApply,
  onReset,
}) => {
  const groups = useMemo(() => groupOptions(DISPATCH_SORT_OPTIONS), []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-2xl border-0 p-0 [&>button]:hidden"
      >
        <div className="flex shrink-0 items-center gap-2 bg-black px-4 py-3 text-white">
          <ArrowUpDown className="h-5 w-5 shrink-0" strokeWidth={2.25} />
          <span className="flex-1 text-base font-semibold tracking-wide">Sort</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/90 hover:bg-white/10 active:bg-white/20"
            aria-label="Close sort"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 py-3 [-webkit-overflow-scrolling:touch]">
          {groups.map(({ section, items }) => (
            <div key={section} className="mb-4 last:mb-0">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{section}</p>
              <div className="space-y-1">
                {items.map((opt) => {
                  const selected = draftSortId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onDraftSortIdChange(opt.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition active:scale-[0.99] ${
                        selected
                          ? 'border-[#7c3aed] bg-[#f5f3ff] text-gray-900'
                          : 'border-gray-200 bg-white text-gray-800'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? 'border-[#7c3aed] bg-[#7c3aed]' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {selected ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
                      </span>
                      <span className="font-medium leading-snug">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-gray-200 bg-white px-4 py-4">
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#3b82f6] via-[#6366f1] to-[#a855f7] py-3.5 text-sm font-bold tracking-wide text-white shadow-md active:opacity-90"
          >
            APPLY SORT
          </button>
          <button
            type="button"
            onClick={() => {
              onDraftSortIdChange(DEFAULT_DISPATCH_SORT_ID);
              onReset();
            }}
            className="rounded-xl border border-gray-300 bg-white px-5 py-3.5 text-sm font-semibold text-gray-800"
          >
            Reset
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
