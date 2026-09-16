import { apiClient } from "@/lib/api";
import type { LeadCalledBackPayload } from "@/lib/realtime/types";

export type InAppNotificationDto = {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  record_id: number | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
  read_at: string | null;
  is_read: boolean;
  /** Structured fields when the API provides them (preferred over message regex). */
  praja_id?: string | null;
  lead_name?: string | null;
  data?: {
    praja_id?: string | null;
    lead_name?: string | null;
    [key: string]: unknown;
  } | null;
};

function parsePrajaId(message: string): string | null {
  const match = message.match(/Praja ID:\s*([^\s·]+)/i);
  return match?.[1] ?? null;
}

function parseLeadName(message: string): string | null {
  const match = message.match(/^(.+?)\s+called back/i);
  return match?.[1]?.trim() || null;
}

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    if (value == null) continue;
    const trimmed = String(value).trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/** Map a persisted in_app_notifications row into the realtime payload shape. */
export function inAppNotificationToPayload(
  row: InAppNotificationDto,
): LeadCalledBackPayload {
  const data = row.data && typeof row.data === "object" ? row.data : null;
  return {
    event: "lead_called_back",
    record_id: row.record_id != null ? String(row.record_id) : "",
    entity_type: "lead",
    lead_name:
      firstNonEmpty(row.lead_name, data?.lead_name, parseLeadName(row.message), row.title) ??
      null,
    praja_id:
      firstNonEmpty(row.praja_id, data?.praja_id, parsePrajaId(row.message)),
    notification_id: row.id,
  };
}

/**
 * Fetch unread lead_called_back rows.
 * Query params ask the API to filter; client still filters defensively.
 */
export async function fetchUnreadInAppNotifications(): Promise<InAppNotificationDto[]> {
  const response = await apiClient.get("/notifications/", {
    params: {
      is_read: false,
      notification_type: "lead_called_back",
      page_size: 100,
    },
  });
  const results = response.data?.results;
  if (!Array.isArray(results)) return [];

  return (results as InAppNotificationDto[]).filter((row) => {
    if (row.notification_type && row.notification_type !== "lead_called_back") {
      return false;
    }
    if (row.is_read === true || row.read_at) return false;
    return true;
  });
}

export async function markInAppNotificationRead(
  notificationId: number,
): Promise<InAppNotificationDto> {
  const response = await apiClient.post(`/notifications/${notificationId}/read/`);
  return response.data as InAppNotificationDto;
}
