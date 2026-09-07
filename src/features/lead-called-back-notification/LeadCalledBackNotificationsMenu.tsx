import { useEffect, useState, type MouseEvent } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getLeadCalledBackNotifications,
  getUnreadLeadCalledBackCount,
  hydrateLeadCalledBackNotifications,
  markLeadCalledBackNotificationRead,
  subscribeLeadCalledBackNotifications,
  type LeadCalledBackNotificationItem,
} from "./leadCalledBackNotificationStore";
import { formatLeadCalledBackDetails } from "@/lib/realtime/leadCalledBackBus";
import { requestOpenLead } from "@/lib/realtime/openLeadBus";

type LeadCalledBackNotificationsMenuProps = {
  variant?: "navbar" | "sidebar" | "sidebar-collapsed";
  className?: string;
  /** Path to All Leads page, e.g. `/app/praja/pages/<id>` */
  allLeadsPath?: string | null;
};

function formatReceivedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function NotificationRow({
  item,
  allLeadsPath,
  onOpenLead,
}: {
  item: LeadCalledBackNotificationItem;
  allLeadsPath?: string | null;
  onOpenLead: () => void;
}) {
  const { leadLabel, phoneLabel, metaLabel } = formatLeadCalledBackDetails(item.payload);
  const [marking, setMarking] = useState(false);

  const openLead = () => {
    requestOpenLead(
      {
        record_id: String(item.payload.record_id),
        praja_id: item.payload.praja_id,
        lead_name: item.payload.lead_name,
        notification_id: item.notificationId,
        notification_item_id: item.id,
      },
      { allLeadsPath },
    );
    onOpenLead();
  };

  const markRead = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (marking) return;
    setMarking(true);
    try {
      await markLeadCalledBackNotificationRead(item);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-3">
      <button type="button" onClick={openLead} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{leadLabel}</p>
            {phoneLabel ? (
              <p className="mt-0.5 text-sm text-gray-700">{phoneLabel}</p>
            ) : null}
            {metaLabel ? (
              <p className="mt-1 text-xs text-gray-500">{metaLabel}</p>
            ) : null}
          </div>
          <span className="shrink-0 text-[11px] text-gray-400">
            {formatReceivedAt(item.receivedAt)}
          </span>
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={openLead}
          className="text-[11px] font-medium text-red-600 hover:underline"
        >
          Open lead →
        </button>
        <button
          type="button"
          onClick={markRead}
          disabled={marking}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          {marking ? "Saving…" : "Mark as read"}
        </button>
      </div>
    </div>
  );
}

export function LeadCalledBackNotificationsMenu({
  variant = "navbar",
  className = "",
  allLeadsPath = null,
}: LeadCalledBackNotificationsMenuProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(getLeadCalledBackNotifications);
  const [unreadCount, setUnreadCount] = useState(getUnreadLeadCalledBackCount);

  useEffect(() => {
    void hydrateLeadCalledBackNotifications();
    return subscribeLeadCalledBackNotifications(() => {
      setItems(getLeadCalledBackNotifications());
      setUnreadCount(getUnreadLeadCalledBackCount());
    });
  }, []);

  const trigger =
    variant === "navbar" ? (
      <Button variant="outline" size="icon" className={`relative ${className}`}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
        <span className="sr-only">Notifications</span>
      </Button>
    ) : (
      <button
        type="button"
        className={`relative flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 ${
          variant === "sidebar-collapsed" ? "justify-center" : "gap-3"
        } ${className}`}
      >
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </div>
        {variant === "sidebar" ? <span>Notifications</span> : null}
      </button>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={variant === "navbar" ? "end" : "start"} className="w-96 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">Notifications</p>
          <p className="text-xs text-gray-500">
            WhatsApp call-back alerts · mark as read to dismiss
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-gray-500">
              No unread call-back notifications.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  allLeadsPath={allLeadsPath}
                  onOpenLead={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
