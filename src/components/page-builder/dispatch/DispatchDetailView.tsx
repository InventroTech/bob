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
import { formatDispatchBool, formatDispatchValue, getRecordData } from './formatDispatchValue';
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

function resolveDisplay(
  field: DispatchFieldDef,
  data: Record<string, unknown>
): { display: string; accent?: string; positive: boolean; show: boolean } {
  if (field.key === '_warranty_updated_flag') {
    const updated =
      isPresent(data.e_warranty_updated_date) || isPresent(data.e_warranty_number);
    return { display: updated ? 'Updated' : '—', positive: updated, show: updated };
  }

  const raw = data[field.key];
  const type = field.type ?? 'str';

  if (field.mailSentChip) {
    const { text, positive } = formatDispatchBool(raw);
    if (!positive) return { display: '—', positive: false, show: false };
    return {
      display: field.label,
      accent: text === 'Yes' ? 'Sent' : text,
      positive: true,
      show: true,
    };
  }

  if (field.statusChip || field.barcodeChip) {
    if (!isPresent(raw) && type !== 'bool') return { display: '—', positive: false, show: false };
    if (type === 'bool' && !formatDispatchBool(raw).positive) {
      return { display: '—', positive: false, show: false };
    }
    const val = formatDispatchValue(raw, type === 'bool' ? 'str' : type);
    // Barcode row shows the formatted value (e.g. date), not the field label.
    if (field.barcodeChip) {
      if (val === '—') return { display: '—', positive: false, show: false };
      return { display: val, positive: false, show: true };
    }
    const text = field.statusChipWithValue && val !== '—' ? `${field.label} ${val}` : field.label;
    return { display: text, positive: true, show: true };
  }

  if (type === 'bool') {
    const { text, positive } = formatDispatchBool(raw);
    if (text === '—' && !field.statusGreen) return { display: '—', positive: false, show: false };
    return { display: text, positive: positive || field.statusGreen, show: true };
  }

  const display = formatDispatchValue(raw, type);
  if (display === '—') return { display, positive: false, show: false };

  const positive =
    field.statusGreen &&
    ['yes', 'sent', 'done', 'received', 'updated', 'true'].some((w) =>
      display.toLowerCase().includes(w)
    );

  return { display, positive, show: true };
}

function StatusChip({ label, accent }: { label: string; accent?: string }) {
  return (
    <div className="flex min-h-[52px] flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      <span className="text-xs font-semibold leading-tight text-gray-900">
        {label}
        {accent ? (
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
  const { display, accent, positive, show } = resolveDisplay(field, data);
  if (!show) return null;

  if (field.statusChip || field.barcodeChip || field.mailSentChip) {
    if (field.barcodeChip) return <BarcodeChip display={display} />;
    return <StatusChip label={display} accent={accent} />;
  }

  if (field.timeChip) {
    return (
      <div className="flex min-h-[52px] flex-1 flex-col justify-center rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          {field.label}
        </div>
        <p className="mt-1 text-sm font-semibold text-gray-900">{display}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[52px] flex-1 flex-col justify-center rounded-lg border border-gray-200 bg-white px-3 py-2">
      <p className="text-[11px] font-medium leading-tight text-gray-500">{field.label}</p>
      <p
        className={`mt-1 text-sm font-semibold leading-snug break-words ${positive ? 'text-emerald-600' : 'text-gray-900'}`}
      >
        {display}
      </p>
    </div>
  );
}

function BarcodeChip({ display }: { display: string }) {
  return (
    <div className="flex min-h-[52px] w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <Barcode className="h-4 w-4 shrink-0 text-gray-600" />
      <div>
        <p className="text-[11px] font-medium text-gray-500">Barcode</p>
        <p className="text-sm font-semibold text-gray-900">{display}</p>
      </div>
    </div>
  );
}

function FieldRow({ row, data }: { row: DispatchFieldRow; data: Record<string, unknown> }) {
  const cells = row.fields
    .map((field) => <FieldCell key={`${field.key}-${field.label}`} field={field} data={data} />)
    .filter(Boolean);
  if (!cells.length) return null;
  const cols = row.fields.length;
  const grid = cols >= 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1';
  return <div className={`grid gap-2 ${grid}`}>{cells}</div>;
}

function SectionBlock({ section, data }: { section: DispatchSectionDef; data: Record<string, unknown> }) {
  const icon = SECTION_ICONS[section.icon];
  const rows = section.rows
    .map((row, i) => <FieldRow key={i} row={row} data={data} />)
    .filter(Boolean);

  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-xl border border-gray-200/80 shadow-sm">
      <div className={`px-3 py-2.5 ${section.headerBg} ${section.headerText}`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-bold">{section.title}</span>
        </div>
        {section.assignee ? (
          <p className="mt-0.5 pl-6 text-xs font-semibold opacity-90">{section.assignee}</p>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <div className={`space-y-2 p-3 ${section.bodyBg}`}>{rows}</div>
      ) : null}
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
    <div className="flex min-h-0 flex-1 flex-col bg-[#f3f4f6] pb-8">
      <div className="border-b border-gray-200 bg-white px-3 py-2">
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
  return (
    <div className="bg-[#1e3a8a] px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-white/75">{label}</p>
      <p className={`mt-0.5 font-semibold text-white ${large ? 'text-sm leading-snug' : 'text-sm'}`}>
        {value}
      </p>
    </div>
  );
}
