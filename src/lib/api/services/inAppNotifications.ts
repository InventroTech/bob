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
};

function parsePrajaId(message: string): string | null {
  const match = message.match(/Praja ID:\s*([^\s·]+)/i);
  return match?.[1] ?? null;
}

function parseLeadName(message: string): string | null {
  const match = message.match(/^(.+?)\s+called back/i);
  return match?.[1]?.trim() || null;
}

/** Map a persisted in_app_notifications row into the realtime payload shape. */
export function inAppNotificationToPayload(
  row: InAppNotificationDto,
): LeadCalledBackPayload {
  return {
    event: "lead_called_back",
    record_id: row.record_id != null ? String(row.record_id) : "",
    entity_type: "lead",
    lead_name: parseLeadName(row.message) || row.title,
    praja_id: parsePrajaId(row.message),
    notification_id: row.id,
  };
}

export async function fetchUnreadInAppNotifications(): Promise<InAppNotificationDto[]> {
  const response = await apiClient.get("/notifications/");
  const results = response.data?.results;
  return Array.isArray(results) ? (results as InAppNotificationDto[]) : [];
}

export async function markInAppNotificationRead(
  notificationId: number,
): Promise<InAppNotificationDto> {
  const response = await apiClient.post(`/notifications/${notificationId}/read/`);
  return response.data as InAppNotificationDto;
}
