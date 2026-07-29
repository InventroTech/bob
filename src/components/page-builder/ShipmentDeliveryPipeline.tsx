'use client';

import { Check, AlertTriangle, ArrowRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SHIPMENT_PIPELINE_STEPS,
  normalizeShipmentStatus,
  type ShipmentTrackEvent,
  type ShipmentTrackDetails,
} from '@/lib/inventory/shipmentTracking';
import { getShipmentStatusLabel } from '@/lib/inventory/statusStyles';

type ShipmentDeliveryPipelineProps = {
  status: unknown;
  disabled?: boolean;
  statusDetail?: string | null;
  liveLoading?: boolean;
  onRefresh?: () => void;
  /** Live carrier route + scan history from shipment-track. */
  details?: ShipmentTrackDetails | null;
  className?: string;
};

function formatEventTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  try {
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

function RouteRow({
  origin,
  destination,
  currentLocation,
}: {
  origin?: string | null;
  destination?: string | null;
  currentLocation?: string | null;
}) {
  if (!origin && !destination && !currentLocation) return null;
  return (
    <div className="space-y-1.5 rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
      {(origin || destination) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            From
          </span>
          <span className="font-medium">{origin || '—'}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            To
          </span>
          <span className="font-medium">{destination || '—'}</span>
        </div>
      )}
      {currentLocation ? (
        <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-medium text-foreground">Last seen: </span>
            {currentLocation}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function EventsList({ events }: { events: ShipmentTrackEvent[] }) {
  if (!events.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Scan history
      </p>
      <ol className="max-h-52 space-y-0 overflow-y-auto rounded-md border border-border/60 bg-background/70">
        {events.map((ev, index) => {
          const when = formatEventTime(ev.time);
          const key = `${ev.time ?? ''}-${ev.message ?? ''}-${ev.location ?? ''}-${index}`;
          return (
            <li
              key={key}
              className={cn(
                'border-b border-border/50 px-2.5 py-2 last:border-b-0',
                index === 0 && 'bg-sky-50/60'
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <p className="text-xs font-medium text-foreground">{ev.message || 'Update'}</p>
                {when ? <p className="text-[10px] text-muted-foreground tabular-nums">{when}</p> : null}
              </div>
              {ev.location ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{ev.location}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Visual delivery pipeline for inventory_request.shipment_status.
 * Steps: Ordered → In transit → Out for delivery → Delivered.
 * Read-only — status comes from live carrier tracking only.
 * Also shows route (from → to) and carrier scan history when available.
 */
export function ShipmentDeliveryPipeline({
  status,
  disabled = false,
  statusDetail,
  liveLoading = false,
  onRefresh,
  details,
  className,
}: ShipmentDeliveryPipelineProps) {
  const normalized = normalizeShipmentStatus(status);
  const isException = normalized === 'EXCEPTION';
  const activeIndex =
    normalized && !isException && normalized !== 'NOT_SHIPPED'
      ? SHIPMENT_PIPELINE_STEPS.indexOf(normalized as (typeof SHIPMENT_PIPELINE_STEPS)[number])
      : -1;

  const events = Array.isArray(details?.events) ? details.events : [];
  const hasRoute = Boolean(details?.origin || details?.destination || details?.current_location);

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
        <p className="text-xs text-muted-foreground">{statusDetail}</p>
      ) : null}

      <div className="flex items-start w-full">
        {SHIPMENT_PIPELINE_STEPS.map((step, index) => {
          const done = activeIndex > index;
          const current = activeIndex === index;
          const upcoming = activeIndex < index;

          // Use a real element (not Fragment): Vite/lovable injects data-lov-id
          // onto JSX nodes, and React.Fragment only allows `key` + `children`.
          return (
            <span key={step} className="contents">
              <div
                className="flex flex-col items-center gap-1.5 min-w-0 flex-1 text-center cursor-default"
                title={getShipmentStatusLabel(step)}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
                    done && 'border-emerald-500 bg-emerald-500 text-white',
                    current && 'border-sky-500 bg-sky-500 text-white ring-2 ring-sky-200',
                    upcoming && !isException && 'border-border bg-background text-muted-foreground',
                    isException && 'border-rose-300 bg-rose-50 text-rose-700'
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
              </div>
              {index < SHIPMENT_PIPELINE_STEPS.length - 1 ? (
                <div
                  className={cn(
                    'mt-3.5 h-0.5 w-4 sm:w-8 shrink-0 rounded-full',
                    activeIndex > index ? 'bg-emerald-400' : 'bg-border'
                  )}
                  aria-hidden
                />
              ) : null}
            </span>
          );
        })}
      </div>

      {isException ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Shipment exception — check with courier / vendor.
        </p>
      ) : null}

      {hasRoute ? (
        <RouteRow
          origin={details?.origin}
          destination={details?.destination}
          currentLocation={details?.current_location}
        />
      ) : null}

      <EventsList events={events} />
    </div>
  );
}
