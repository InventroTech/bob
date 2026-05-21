import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import type { FilterConfig } from '@/component-config/DynamicFilterConfig';
import { DispatchFilterIcon } from './DispatchFilterIcon';
import {
  emptyDispatchFilterValues,
  getActiveDispatchFilterChips,
  getEmptyValueForFilter,
  groupDispatchFilterRows,
  inferSegmentSide,
  type DispatchFilterValues,
} from './dispatchMobileFilters';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterConfig[];
  draft: DispatchFilterValues;
  onDraftChange: (next: DispatchFilterValues) => void;
  onApply: () => void;
  onClear: () => void;
};

type PatchFn = (key: string, value: unknown) => void;

function FilterTextInput({
  placeholder,
  value,
  onChange,
  className,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6366f1] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/25 ${className ?? ''}`}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold text-gray-700">{children}</p>;
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? undefined : d;
}

function dateInputValue(value: unknown): string {
  const d = toDate(value);
  return d ? format(d, 'yyyy-MM-dd') : '';
}

function MobileSingleDateField({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: unknown;
  onChange: (v: Date | undefined) => void;
}) {
  return (
    <div>
      <FieldLabel>{filter.label}</FieldLabel>
      <div className="relative">
        <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="date"
          value={dateInputValue(value)}
          onChange={(e) =>
            onChange(e.target.value ? new Date(`${e.target.value}T12:00:00`) : undefined)
          }
          className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 focus:border-[#6366f1] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/25"
        />
      </div>
    </div>
  );
}

function MobileCalendarButton({
  label,
  date,
  onSelect,
}: {
  label: string;
  date?: Date;
  onSelect: (d?: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-w-0 flex-1">
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm text-gray-900 focus:border-[#6366f1] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/25"
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
            <span className={date ? 'text-gray-900' : 'text-gray-400'}>
              {date ? format(date, 'MMM d, yyyy') : label}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={date}
            onSelect={(d) => {
              onSelect(d ?? undefined);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MobileDateRangeField({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: { start?: unknown; end?: unknown } | undefined;
  onChange: (v: { start?: Date; end?: Date }) => void;
}) {
  const startLabel = filter.dateRangeStartLabel || 'Start Date';
  const endLabel = filter.dateRangeEndLabel || 'End Date';
  const startDate = toDate(value?.start);
  const endDate = toDate(value?.end);
  const isDateTime = filter.type === 'date_time_range';

  const patchStart = (d?: Date) => {
    let start = d;
    if (isDateTime && start) {
      const prev = startDate;
      start = new Date(start);
      start.setHours(prev?.getHours() ?? 0, prev?.getMinutes() ?? 0, 0, 0);
    }
    onChange({ start, end: endDate });
  };

  const patchEnd = (d?: Date) => {
    let end = d;
    if (isDateTime && end) {
      const prev = endDate;
      end = new Date(end);
      end.setHours(prev?.getHours() ?? 23, prev?.getMinutes() ?? 59, 0, 0);
    }
    onChange({ start: startDate, end });
  };

  return (
    <div>
      {filter.label ? <FieldLabel>{filter.label}</FieldLabel> : null}
      <div className="grid grid-cols-2 gap-3">
        <MobileCalendarButton label={startLabel} date={startDate} onSelect={patchStart} />
        <MobileCalendarButton label={endLabel} date={endDate} onSelect={patchEnd} />
      </div>
      {isDateTime ? (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <input
            type="time"
            value={startDate ? format(startDate, 'HH:mm') : '00:00'}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              const base = startDate ? new Date(startDate) : new Date();
              base.setHours(h || 0, m || 0, 0, 0);
              onChange({ start: base, end: endDate });
            }}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
          />
          <input
            type="time"
            value={endDate ? format(endDate, 'HH:mm') : '23:59'}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              const base = endDate ? new Date(endDate) : new Date();
              base.setHours(h ?? 23, m ?? 59, 0, 0);
              onChange({ start: startDate, end: base });
            }}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
      ) : null}
    </div>
  );
}

/** Mini toggles — evenly spaced row below date fields (Figma). */
function MiniToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean | null) => void;
}) {
  const on = value === true;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-center text-[11px] font-medium leading-tight text-gray-600">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(on ? null : true)}
        className={`relative flex h-9 w-14 items-center rounded-md border border-gray-300 p-0.5 transition ${
          on ? 'bg-[#ede9fe]' : 'bg-gray-100'
        }`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-sm shadow-sm transition-transform ${
            on ? 'translate-x-[22px] bg-[#7c3aed]' : 'translate-x-0 bg-gray-700'
          }`}
        >
          {!on ? <X className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
        </span>
      </button>
    </div>
  );
}

function ToggleRow({
  toggles,
  draft,
  patch,
}: {
  toggles: FilterConfig[];
  draft: DispatchFilterValues;
  patch: PatchFn;
}) {
  if (toggles.length === 0) return null;
  return (
    <div
      className={`grid gap-4 pt-1 ${
        toggles.length >= 2 ? 'grid-cols-2' : 'grid-cols-1 justify-items-center'
      }`}
    >
      {toggles.map((t) => {
        const raw = draft[t.key];
        const on = raw === true || raw === 'true' || raw === 'Yes' || raw === 'yes';
        return (
          <MiniToggle
            key={t.key}
            label={t.label}
            value={on}
            onChange={(v) => patch(t.key, v === true ? 'Yes' : null)}
          />
        );
      })}
    </div>
  );
}

/** Segment control — matches Figma: lavender bar, purple pill on selected option only. */
function SegmentRow({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: 'left' | 'right' | null;
  onChange: (v: 'left' | 'right' | null) => void;
}) {
  const segmentBtn = (side: 'left' | 'right', text: string) => {
    const selected = value === side;
    return (
      <button
        type="button"
        onClick={() => onChange(selected ? null : side)}
        className={`relative z-10 flex flex-1 items-center justify-center rounded-[10px] py-3 text-sm font-semibold transition-colors duration-150 ${
          selected ? 'text-white' : 'text-[#1e293b]'
        }`}
      >
        {text}
      </button>
    );
  };

  return (
    <div>
      <p className="mb-2.5 text-[15px] font-bold leading-tight text-[#0f172a]">{label}</p>
      <div className="relative flex w-full rounded-xl bg-[#f3f0ff] p-1.5">
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-1.5 top-1.5 w-[calc(50%-6px)] rounded-[10px] bg-[#7c3aed] shadow-sm transition-all duration-200 ease-out ${
            value === 'right' ? 'left-[calc(50%+3px)]' : 'left-1.5'
          } ${value === null ? 'opacity-0' : 'opacity-100'}`}
        />
        {segmentBtn('left', leftLabel)}
        {segmentBtn('right', rightLabel)}
      </div>
    </div>
  );
}

function ActiveFilterChips({
  chips,
  onRemove,
}: {
  chips: { key: string; label: string }[];
  onRemove: (key: string) => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-gray-200 bg-[#f1f5f9] px-4 py-3">
      <div className="flex flex-wrap gap-3">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="relative inline-flex max-w-full rounded-full border-2 border-[#c4b5fd] bg-[#f8fafc] py-1.5 pl-4 pr-5 text-sm font-medium text-gray-800"
          >
            <span className="truncate">{chip.label}</span>
            <button
              type="button"
              aria-label={`Remove ${chip.label}`}
              onClick={() => onRemove(chip.key)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-gray-300 shadow-sm active:bg-gray-400"
            >
              <X className="h-3 w-3 text-gray-900" strokeWidth={2.5} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function MobileSelectField({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: unknown;
  onChange: (v: string[]) => void;
}) {
  const selected = Array.isArray(value) ? (value as string[]) : value ? [String(value)] : [];
  const options = filter.options ?? [];
  const [open, setOpen] = useState(false);

  const toggle = (optValue: string) => {
    const next = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue];
    onChange(next);
  };

  const summary =
    selected.length === 0
      ? filter.placeholder || `Select ${filter.label}`
      : selected
          .map((v) => options.find((o) => o.value === v)?.label ?? v)
          .join(', ');

  return (
    <div>
      <FieldLabel>{filter.label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
          >
            <span className="truncate text-left">{summary}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-gray-50"
              >
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={() => toggle(opt.value)}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function renderField(filter: FilterConfig, draft: DispatchFilterValues, patch: PatchFn) {
  const raw = draft[filter.key];

  if (filter.dispatchUi === 'toggle') {
    const on = raw === true || raw === 'true' || raw === 'Yes' || raw === 'yes';
    return (
      <MiniToggle
        key={filter.key}
        label={filter.label}
        value={on}
        onChange={(v) => patch(filter.key, v === true ? 'Yes' : null)}
      />
    );
  }

  if (filter.dispatchUi === 'segment' || (filter.type === 'select' && (filter.options?.length ?? 0) === 2)) {
    const opts = filter.options ?? [];
    const left = opts[0]?.label ?? 'Yes';
    const right = opts[1]?.label ?? 'No';
    const leftVal = opts[0]?.value ?? '';
    const rightVal = opts[1]?.value ?? '';
    const side = inferSegmentSide(filter, raw);
    return (
      <SegmentRow
        key={filter.key}
        label={filter.label}
        leftLabel={left}
        rightLabel={right}
        value={side}
        onChange={(v) =>
          patch(
            filter.key,
            v === 'left' ? leftVal : v === 'right' ? rightVal : filter.type === 'select' ? [] : null
          )
        }
      />
    );
  }

  if (filter.dispatchUi === 'chip') {
    const text = typeof raw === 'string' ? raw : '';
    return (
      <FilterTextInput
        key={filter.key}
        placeholder={filter.placeholder || filter.label}
        value={text}
        onChange={(v) => patch(filter.key, v)}
      />
    );
  }

  switch (filter.type) {
    case 'date_range':
    case 'date_time_range':
      return (
        <MobileDateRangeField
          key={filter.key}
          filter={filter}
          value={(raw as { start?: unknown; end?: unknown }) ?? { start: undefined, end: undefined }}
          onChange={(v) => patch(filter.key, v)}
        />
      );
    case 'date_gte':
    case 'date_lte':
      return (
        <MobileSingleDateField
          key={filter.key}
          filter={filter}
          value={raw}
          onChange={(v) => patch(filter.key, v)}
        />
      );
    case 'select':
    case 'in':
      return (
        <MobileSelectField
          key={filter.key}
          filter={filter}
          value={raw}
          onChange={(v) => patch(filter.key, v)}
        />
      );
    case 'number_gte':
    case 'number_lte':
    case 'gt':
    case 'lt':
      return (
        <div key={filter.key}>
          <FieldLabel>{filter.label}</FieldLabel>
          <input
            type="number"
            placeholder={filter.placeholder || filter.label}
            value={raw != null && raw !== '' ? String(raw) : ''}
            onChange={(e) => patch(filter.key, e.target.value === '' ? '' : Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#6366f1] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/25"
          />
        </div>
      );
    default:
      return (
        <FilterTextInput
          key={filter.key}
          placeholder={filter.placeholder || filter.label}
          value={typeof raw === 'string' ? raw : raw != null ? String(raw) : ''}
          onChange={(v) => patch(filter.key, v)}
        />
      );
  }
}

function FilterRowBlock({
  row,
  draft,
  onDraftChange,
}: {
  row: { rowId: string; fields: FilterConfig[] };
  draft: DispatchFilterValues;
  onDraftChange: (next: DispatchFilterValues) => void;
}) {
  const patch: PatchFn = (key, value) => onDraftChange({ ...draft, [key]: value });

  const dateRangeFields = row.fields.filter(
    (f) => f.type === 'date_range' || f.type === 'date_time_range'
  );
  const toggles = row.fields.filter((f) => f.dispatchUi === 'toggle');
  const nonToggleFields = row.fields.filter((f) => f.dispatchUi !== 'toggle');

  const isRowStart = row.rowId === 'row_start';
  const isPairedDates =
    row.fields.length === 2 &&
    row.fields.every((f) => f.type === 'date_gte' || f.type === 'date_lte');

  if (isRowStart && (dateRangeFields.length > 0 || toggles.length > 0)) {
    const mainFields = nonToggleFields.filter(
      (f) => f.type !== 'date_range' && f.type !== 'date_time_range'
    );
    return (
      <div className="space-y-3">
        {dateRangeFields.map((f) => (
          <div key={f.key}>{renderField(f, draft, patch)}</div>
        ))}
        {mainFields.map((f) => (
          <div key={f.key}>{renderField(f, draft, patch)}</div>
        ))}
        <ToggleRow toggles={toggles} draft={draft} patch={patch} />
      </div>
    );
  }

  if (isPairedDates) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {row.fields.map((f) => (
          <div key={f.key} className="min-w-0">
            {renderField(f, draft, patch)}
          </div>
        ))}
      </div>
    );
  }

  if (row.fields.length === 2 && row.fields.every((f) => f.dispatchWidth === 'half')) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {row.fields.map((f) => (
          <div key={f.key} className="min-w-0">
            {renderField(f, draft, patch)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {row.fields.map((f) => (
        <div key={f.key} className="min-w-0">
          {renderField(f, draft, patch)}
        </div>
      ))}
    </div>
  );
}

export const DispatchFilterSheet: React.FC<Props> = ({
  open,
  onOpenChange,
  filters,
  draft,
  onDraftChange,
  onApply,
  onClear,
}) => {
  const rows = useMemo(() => groupDispatchFilterRows(filters), [filters]);
  const activeChips = useMemo(
    () => getActiveDispatchFilterChips(filters, draft),
    [filters, draft]
  );

  const handleClear = () => {
    onDraftChange(emptyDispatchFilterValues(filters));
    onClear();
  };

  const handleRemoveChip = (key: string) => {
    const filter = filters.find((f) => f.key === key);
    if (!filter) return;
    onDraftChange({ ...draft, [key]: getEmptyValueForFilter(filter) });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-2xl border-0 p-0 [&>button]:hidden"
      >
        <div className="flex shrink-0 items-center gap-2 bg-black px-4 py-3 text-white">
          <DispatchFilterIcon inverted />
          <span className="text-base font-semibold tracking-wide">Filters</span>
        </div>

        <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
          <div className="space-y-4">
            {rows.map((row) => (
              <FilterRowBlock key={row.rowId} row={row} draft={draft} onDraftChange={onDraftChange} />
            ))}
          </div>
        </div>

        <ActiveFilterChips chips={activeChips} onRemove={handleRemoveChip} />

        <div className="flex shrink-0 gap-2 border-t border-gray-200 bg-white px-4 py-4">
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#3b82f6] via-[#6366f1] to-[#a855f7] py-3.5 text-sm font-bold tracking-wide text-white shadow-md active:opacity-90"
          >
            APPLY FILTERS
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-xl border border-gray-300 bg-white px-5 py-3.5 text-sm font-semibold text-gray-800"
          >
            Clear
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
