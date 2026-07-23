'use client';

import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SHIPMENT_PIPELINE_STEPS,
  normalizeShipmentStatus,
  type ShipmentStatus,
} from '@/lib/shipmentTracking';
import { getShipmentStatusLabel } from '@/lib/inventoryStatusStyles';

type ShipmentDeliveryPipelineProps = {
  status: unknown;
  disabled?: boolean;
  /** Optional manual override; live tracking is the primary source. */
  onChange?: (status: ShipmentStatus) => void;
  statusDetail?: string | null;
  liveLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
};

/**
 * Visual delivery pipeline for inventory_request.shipment_status.
 * Steps: Ordered → In transit → Out for delivery → Delivered.
 */
export function ShipmentDeliveryPipeline({
  status,
  disabled = false,
  onChange,
  statusDetail,
  liveLoading = false,
  onRefresh,
  className,
}: ShipmentDeliveryPipelineProps) {
  const normalized = normalizeShipmentStatus(status);
  const isException = normalized === 'EXCEPTION';
  const activeIndex =
    normalized && !isException && normalized !== 'NOT_SHIPPED'
      ? SHIPMENT_PIPELINE_STEPS.indexOf(normalized as (typeof SHIPMENT_PIPELINE_STEPS)[number])
      : -1;

  return (
    <div className={cn('space-y-3 rounded-md border border-border/70 bg-muted/20 px-3 py-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Delivery pipeline
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-foreground">
            {liveLoading
              ? 'Checking carrier…'
              : isException
                ? 'Exception'
                : activeIndex >= 0
                  ? getShipmentStatusLabel(SHIPMENT_PIPELINE_STEPS[activeIndex])
                  : 'Not shipped yet'}
          </p>
          {onRefresh ? (
            <button
              type="button"
              className="text-[11px] text-sky-700 hover:underline disabled:opacity-50"
              disabled={disabled || liveLoading}
              onClick={onRefresh}
            >
              {liveLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          ) : null}
        </div>
      </div>

      {statusDetail ? (
        <p className="text-xs text-muted-foreground line-clamp-2">{statusDetail}</p>
      ) : null}

      <div className="flex items-start w-full">
        {SHIPMENT_PIPELINE_STEPS.map((step, index) => {
          const done = activeIndex > index;
          const current = activeIndex === index;
          const upcoming = activeIndex < index;
          const clickable = Boolean(onChange) && !disabled;

          return (
            <React.Fragment key={step}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onChange?.(step)}
                className={cn(
                  'flex flex-col items-center gap-1.5 min-w-0 flex-1 text-center',
                  clickable ? 'cursor-pointer group' : 'cursor-default'
                )}
                title={getShipmentStatusLabel(step)}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
                    done && 'border-emerald-500 bg-emerald-500 text-white',
                    current && 'border-sky-500 bg-sky-500 text-white ring-2 ring-sky-200',
                    upcoming && !isException && 'border-border bg-background text-muted-foreground',
                    isException && 'border-rose-300 bg-rose-50 text-rose-700',
                    clickable && upcoming && 'group-hover:border-sky-300 group-hover:text-sky-700'
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                </span>
                <span
                  className={cn(
                    'text-[10px] leading-tight px-0.5',
                    current && 'font-semibold text-foreground',
                    done && 'text-emerald-700',
                    (upcoming || isException) && 'text-muted-foreground'
                  )}
                >
                  {getShipmentStatusLabel(step)}
                </span>
              </button>
              {index < SHIPMENT_PIPELINE_STEPS.length - 1 ? (
                <div
                  className={cn(
                    'mt-3.5 h-0.5 w-4 sm:w-8 shrink-0 rounded-full',
                    activeIndex > index ? 'bg-emerald-400' : 'bg-border'
                  )}
                  aria-hidden
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      {onChange && !disabled ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]',
              normalized === 'NOT_SHIPPED' || !normalized
                ? 'border-slate-300 bg-slate-50 text-slate-800'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
            )}
            onClick={() => onChange('NOT_SHIPPED')}
          >
            Not shipped
          </button>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]',
              isException
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
            )}
            onClick={() => onChange('EXCEPTION')}
          >
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Exception
          </button>
        </div>
      ) : isException ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Shipment exception — check with courier / vendor.
        </p>
      ) : null}
    </div>
  );
}
