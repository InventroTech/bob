import React from 'react';
import type { CrmRecord } from '@/lib/crmRecordsApi';
import { formatDispatchValue, getRecordData } from './formatDispatchValue';

function DispatchCardLine({
  label,
  value,
  align = 'left',
  valueClassName = '',
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
  valueClassName?: string;
}) {
  return (
    <p
      className={`min-w-0 truncate whitespace-nowrap text-xs text-gray-600 ${
        align === 'right' ? 'text-right' : ''
      }`}
    >
      <span className="text-gray-500">{label}</span>{' '}
      <span className={`font-semibold text-gray-800 ${valueClassName}`}>{value}</span>
    </p>
  );
}

export type DispatchListCardFieldConfig = {
  titleField: string;
  poField: string;
  dcNumberField: string;
  salesOrderField: string;
  indexField: string;
  dcDateField: string;
};

export function DispatchListCard({
  record,
  fields,
  onClick,
}: {
  record: CrmRecord;
  fields: DispatchListCardFieldConfig;
  onClick: () => void;
}) {
  const data = getRecordData(record);
  const titleVal = formatDispatchValue(data[fields.titleField]);
  const po = formatDispatchValue(data[fields.poField]);
  const dcNo = formatDispatchValue(data[fields.dcNumberField]);
  const so = formatDispatchValue(data[fields.salesOrderField]);
  const engineer = formatDispatchValue(data[fields.indexField]);
  const dcDate = formatDispatchValue(data[fields.dcDateField], 'date');

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border-2 border-[#7c3aed]/40 bg-white p-4 text-left shadow-[0_2px_12px_rgba(124,58,237,0.15)] transition active:scale-[0.99]"
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <p className="min-w-0 truncate whitespace-nowrap text-xs font-medium text-gray-600">
          {engineer}
        </p>
        <DispatchCardLine label="Po # :" value={po} align="right" />
        <DispatchCardLine label="DC Date :" value={dcDate} />
        <DispatchCardLine label="DC No :" value={dcNo} align="right" />
        <p className="min-w-0 line-clamp-2 text-sm font-bold uppercase leading-snug text-gray-900">
          {titleVal}
        </p>
        <DispatchCardLine label="SO No :" value={so} align="right" />
      </div>
    </button>
  );
}
