import { PhoneCall, X } from "lucide-react";
import type { LeadCalledBackPayload } from "@/lib/realtime/types";
import { formatLeadCalledBackDetails } from "@/lib/realtime/leadCalledBackBus";
import { getRegisteredAllLeadsPath, requestOpenLead } from "@/lib/realtime/openLeadBus";

type LeadCalledBackNotificationToastProps = {
  payload: LeadCalledBackPayload;
  onDismiss?: () => void;
};

export function LeadCalledBackNotificationToast({
  payload,
  onDismiss,
}: LeadCalledBackNotificationToastProps) {
  const { leadLabel, phoneLabel, metaLabel } = formatLeadCalledBackDetails(payload);

  const openLead = () => {
    requestOpenLead(
      {
        record_id: String(payload.record_id),
        praja_id: payload.praja_id,
        lead_name: payload.lead_name,
        notification_id: payload.notification_id ?? null,
        notification_item_id:
          payload.notification_id != null
            ? `db-${payload.notification_id}`
            : null,
      },
      { allLeadsPath: getRegisteredAllLeadsPath() },
    );
    onDismiss?.();
  };

  return (
    <div className="pointer-events-auto w-[min(100vw-2rem,280px)] overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-lg ring-1 ring-blue-100">
      <div className="relative">
        {onDismiss ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDismiss();
            }}
            className="absolute right-1.5 top-1.5 z-10 rounded-md p-0.5 text-gray-400 transition hover:bg-blue-50 hover:text-gray-600"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={openLead}
          className="flex w-full items-start gap-2.5 rounded-2xl px-3 py-2.5 pr-7 text-left transition hover:bg-blue-50/60"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <PhoneCall className="h-3.5 w-3.5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
              WhatsApp call back
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold leading-tight text-gray-900">
              {leadLabel}
            </p>
            {phoneLabel ? (
              <p className="mt-0.5 truncate text-xs text-gray-700">{phoneLabel}</p>
            ) : null}
            {metaLabel ? (
              <p className="mt-0.5 truncate text-[11px] text-gray-500">{metaLabel}</p>
            ) : null}
          </div>
        </button>
      </div>
    </div>
  );
}
