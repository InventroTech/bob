import React from 'react';
import {
  Barcode,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  Mail,
  MapPin,
  Shield,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import {
  DISPATCH_DETAIL_SECTIONS,
  type DispatchFieldDef,
  type DispatchFieldRow,
  type DispatchSectionDef,
} from './dispatchFieldSections';
import {
  DISPATCH_NO_DATA,
  formatDispatchBool,
  formatDispatchValue,
  getRecordData,
} from './formatDispatchValue';
import type { CrmRecord } from '@/lib/crmRecordsApi';

const SECTION_ICONS: Record<DispatchSectionDef['icon'], React.ReactNode> = {
  cart: <ShoppingCart className="h-4 w-4 shrink-0" />,
  map: <MapPin className="h-4 w-4 shrink-0" />,
  calendar: <Calendar className="h-4 w-4 shrink-0" />,
  truck: <Truck className="h-4 w-4 shrink-0" />,
  shield: <Shield className="h-4 w-4 shrink-0" />,
  mail: <Mail className="h-4 w-4 shrink-0" />,
  file: <FileText className="h-4 w-4 shrink-0" />,
  checks: <CheckCircle2 className="h-4 w-4 shrink-0" />,
};

function isPresent(raw: unknown): boolean {
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'string') return raw.trim() !== '';
  return true;
}

type ResolvedField = {
  display: string;
  accent?: string;
  positive: boolean;
  isEmpty: boolean;
};

function resolveDisplay(field: DispatchFieldDef, data: Record<string, unknown>): ResolvedField {
  const raw = data[field.key];
  const type = field.type ?? 'str';
  const empty = !isPresent(raw);

  if (field.key === '_warranty_updated_flag') {
    const updated =
      isPresent(data.e_warranty_updated_date) || isPresent(data.e_warranty_number);
    return {
      display: updated ? 'Updated' : DISPATCH_NO_DATA,
      positive: updated,
      isEmpty: !updated,
    };
  }

  if (field.mailSentChip) {
    if (empty) {
      return { display: DISPATCH_NO_DATA, positive: false, isEmpty: true };
    }
    const { text, positive } = formatDispatchBool(raw);
    if (!positive) {
      return { display: DISPATCH_NO_DATA, positive: false, isEmpty: true };
    }
    return {
      display: field.label,
      accent: text === 'Yes' ? 'Sent' : text,
      positive: true,
      isEmpty: false,
    };
  }

  if (field.statusChip || field.barcodeChip) {
    if (empty) {
      return { display: DISPATCH_NO_DATA, positive: false, isEmpty: true };
    }
    if (type === 'bool' && !formatDispatchBool(raw).positive) {
      return { display: DISPATCH_NO_DATA, positive: false, isEmpty: true };
    }
    const val = formatDispatchValue(raw, type === 'bool' ? 'str' : type);
    if (field.barcodeChip) {
      return { display: val, positive: false, isEmpty: val === DISPATCH_NO_DATA };
    }
    const text =
      field.statusChipWithValue && val !== DISPATCH_NO_DATA
        ? `${field.label} ${val}`
        : field.label;
    return { display: text, positive: true, isEmpty: false };
  }

  if (type === 'bool') {
    const { text, positive } = formatDispatchBool(raw);
    const isEmptyBool = text === DISPATCH_NO_DATA && !field.statusGreen;
    return {
      display: isEmptyBool ? DISPATCH_NO_DATA : text,
      positive: positive || field.statusGreen,
      isEmpty: isEmptyBool,
    };
  }

  const display = formatDispatchValue(raw, type);
  const isEmptyValue = display === DISPATCH_NO_DATA;

  const positive =
    !isEmptyValue &&
    field.statusGreen &&
    ['yes', 'sent', 'done', 'received', 'updated', 'true'].some((w) =>
      display.toLowerCase().includes(w)
    );

  return { display, positive, isEmpty: isEmptyValue };
}

function valueClass(isEmpty: boolean, positive: boolean) {
  if (isEmpty) return 'text-gray-500 font-medium italic';
  if (positive) return 'text-emerald-600';
  return 'text-gray-900';
}

function StatusChip({
  label,
  accent,
  isEmpty,
}: {
  label: string;
  accent?: string;
  isEmpty?: boolean;
}) {
  return (
    <div className="flex min-h-[52px] w-full min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      {!isEmpty ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
      <span className={`text-xs font-semibold leading-tight ${isEmpty ? 'italic text-gray-500' : 'text-gray-900'}`}>
        {label}
        {accent && !isEmpty ? (
          <>
            {' '}
            <span className="text-emerald-600">{accent}</span>
          </>
        ) : null}
      </span>
    </div>
  );
}

function FieldCell({ field, data }: { field: DispatchFieldDef; data: Record<string, unknown> }) {
  const { display, accent, positive, isEmpty } = resolveDisplay(field, data);

  if (field.statusChip || field.barcodeChip || field.mailSentChip) {
    if (field.barcodeChip) {
      return (
        <div className="flex min-h-[52px] w-full min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Barcode className="h-4 w-4 shrink-0 text-gray-600" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-500">Barcode</p>
            <p className={`text-sm font-semibold break-words ${valueClass(isEmpty, false)}`}>
              {display}
            </p>
          </div>
        </div>
      );
    }
    if (field.mailSentChip && !isEmpty) {
      return <StatusChip label={display} accent={accent} isEmpty={false} />;
    }
    if (field.mailSentChip && isEmpty) {
      return (
        <div className="flex min-h-[52px] w-full min-w-0 flex-col justify-center rounded-lg border border-gray-200 bg-white px-3 py-2">
          <p className="text-[11px] font-medium text-gray-500">{field.label}</p>
          <p className={`mt-1 text-sm break-words ${valueClass(true, false)}`}>{display}</p>
        </div>
      );
    }
    return <StatusChip label={display} accent={accent} isEmpty={isEmpty} />;
  }

  if (field.timeChip) {
    return (
      <div className="flex min-h-[52px] w-full min-w-0 flex-col justify-center rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          {field.label}
        </div>
        <p className={`mt-1 text-sm font-semibold break-words ${valueClass(isEmpty, false)}`}>
          {display}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[52px] w-full min-w-0 flex-col justify-center rounded-lg border border-gray-200 bg-white px-3 py-2">
      <p className="text-[11px] font-medium leading-tight text-gray-500">{field.label}</p>
      <p className={`mt-1 text-sm font-semibold leading-snug break-words ${valueClass(isEmpty, positive)}`}>
        {display}
      </p>
    </div>
  );
}

function FieldRow({ row, data }: { row: DispatchFieldRow; data: Record<string, unknown> }) {
  const cols = row.fields.length;
  const grid = cols >= 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1';
  return (
    <div className={`grid gap-2 ${grid}`}>
      {row.fields.map((field) => (
        <FieldCell key={`${field.key}-${field.label}`} field={field} data={data} />
      ))}
    </div>
  );
}

function SectionBlock({ section, data }: { section: DispatchSectionDef; data: Record<string, unknown> }) {
  const icon = SECTION_ICONS[section.icon];

  return (
    <section className="mx-3 mt-3 shrink-0 rounded-xl border border-gray-200/80 shadow-sm">
      <div className={`px-3 py-2.5 ${section.headerBg} ${section.headerText}`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-bold">{section.title}</span>
        </div>
        {section.assignee ? (
          <p className="mt-0.5 pl-6 text-xs font-semibold opacity-90">{section.assignee}</p>
        ) : null}
      </div>
      <div className={`space-y-2 p-3 ${section.bodyBg}`}>
        {section.rows.map((row, i) => (
          <FieldRow key={i} row={row} data={data} />
        ))}
      </div>
    </section>
  );
}

export interface DispatchDetailViewProps {
  record: CrmRecord;
  onBack: () => void;
}

export const DispatchDetailView: React.FC<DispatchDetailViewProps> = ({ record, onBack }) => {
  const data = getRecordData(record);
  const srNo = formatDispatchValue(data.sr_no);
  const dcDate = formatDispatchValue(data.dc_date, 'date');
  const account = formatDispatchValue(data.account_name);
  const dc = formatDispatchValue(data.dc_number);

  return (
    <div className="flex h-full min-h-0 max-h-full flex-col bg-[#f3f4f6]">
      <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-gray-800"
          aria-label="Back to list"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <div className="pb-[max(12rem,calc(10rem+env(safe-area-inset-bottom,0px)))]">
          <header className="mx-3 mt-3 overflow-hidden rounded-xl bg-[#1e3a8a] text-white shadow-md">
            <div className="grid grid-cols-2 gap-px bg-white/20">
              <HeaderCell label="Sr. No." value={srNo} />
              <HeaderCell label="DC Date" value={dcDate} />
              <HeaderCell label="Account Name" value={account} large />
              <HeaderCell label="DC Number" value={dc} />
            </div>
          </header>

          {DISPATCH_DETAIL_SECTIONS.map((section) => (
            <SectionBlock key={section.id} section={section} data={data} />
          ))}
        </div>
      </div>
    </div>
  );
};

function HeaderCell({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  const isEmpty = value === DISPATCH_NO_DATA;
  return (
    <div className="bg-[#1e3a8a] px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-white/75">{label}</p>
      <p
        className={`mt-0.5 font-semibold ${large ? 'text-sm leading-snug' : 'text-sm'} ${
          isEmpty ? 'italic text-white/70' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
};
