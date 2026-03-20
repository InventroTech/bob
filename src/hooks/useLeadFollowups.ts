import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type LeadFollowupNotification = {
  id: number;
  name: string;
  phone_no?: string;
  lead_status?: string;
  next_call_at?: string | null;
  call_attempts?: number;
  latest_remarks?: string;
};

const READ_KEY = "lead_followup_read_ids";

export function formatNextCallRelative(next_call_at?: string | null): string {
  if (!next_call_at) return "due now";
  // Treat backend timestamp as UTC if it has no explicit offset.
  const hasOffset = /[zZ]$|[+-]\d\d:?\d\d$/.test(next_call_at);
  const iso = hasOffset ? next_call_at : `${next_call_at}Z`;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return next_call_at;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMin = Math.round(Math.abs(diffMs) / 60000);
  if (diffMin === 0) return "due now";
  if (diffMs > 0) {
    return `${diffMin} minute${diffMin === 1 ? "" : "s"} later`;
  }
  return `${diffMin} minute${diffMin === 1 ? "" : "s"} prior`;
}

function getReadIds(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore storage errors
  }
}

export function useLeadFollowups() {
  return useQuery<LeadFollowupNotification[]>({
    queryKey: ["lead-followups"],
    queryFn: async () => {
      const res = await apiClient.get("/crm-records/leads/followups/");
      const data = res.data;
      console.log("[LeadFollowups] raw response data:", data);
      // Backend should return a list; if it ever returns an object (e.g. error),
      // fall back to an empty list so the UI doesn't break.
      if (!Array.isArray(data)) {
        console.warn("[LeadFollowups] expected array, got:", typeof data);
        return [];
      }
      console.log("[LeadFollowups] notifications count:", data.length);
      return data;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useLeadFollowupsWithUnread() {
  const query = useLeadFollowups();
  const notifications = Array.isArray(query.data) ? query.data : [];

  const readIds = getReadIds();
  const unread = notifications.filter((n) => !readIds.has(n.id));

  const markAsRead = (id: number) => {
    const updated = new Set(readIds);
    updated.add(id);
    saveReadIds(updated);
  };

  const markAllAsRead = () => {
    const updated = new Set(readIds);
    notifications.forEach((n) => updated.add(n.id));
    saveReadIds(updated);
  };

  return {
    ...query,
    notifications,
    unread,
    unreadCount: unread.length,
    markAsRead,
    markAllAsRead,
  };
}

