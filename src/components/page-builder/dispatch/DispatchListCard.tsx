import React from 'react';
import type { CrmRecord } from '@/lib/crmRecordsApi';
import { formatDispatchValue, getRecordData } from './formatDispatchValue';

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
  index,
  onClick,
}: {
  record: CrmRecord;
  fields: DispatchListCardFieldConfig;
  index?: number;
  onClick: () => void;
}) {
  const data = getRecordData(record);
  const titleVal = formatDispatchValue(data[fields.titleField]);
  const po = formatDispatchValue(data[fields.poField]);
  const dcNo = formatDispatchValue(data[fields.dcNumberField]);
  const so = formatDispatchValue(data[fields.salesOrderField]);
  const indexVal = formatDispatchValue(data[fields.indexField]);

  const leftId = dcNo || indexVal || (index != null ? String(index).padStart(3, '0') : '');

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-[#7c3aed]/35 bg-white p-4 text-left transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {leftId ? (
            <p className="text-xs font-semibold text-gray-600">{leftId}</p>
          ) : null}
          <p className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-gray-900">{titleVal}</p>
        </div>
        <div className="min-w-0 shrink-0 text-right">
          {po ? (
            <p className="truncate text-xs text-gray-600">
              <span className="text-gray-500">Po # :</span>{' '}
              <span className="font-semibold text-gray-800">{po}</span>
            </p>
          ) : null}
          {so ? (
            <p className="mt-1 truncate text-xs text-gray-600">
              <span className="font-semibold text-gray-800">{so}</span>
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
