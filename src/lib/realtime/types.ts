export type RecordUpdatedPayload = {
  event: "record_updated";
  record_id: string;
  entity_type: string;
  lead_stage?: string | null;
  assigned_to?: string | null;
  created: boolean;
  updated_at?: string | null;
  data?: Record<string, unknown>;
};

export type RealtimeConnectedPayload = {
  event: "connected";
  tenant_id: string;
};

export type RealtimePongPayload = {
  event: "pong";
};

export type RealtimePayload =
  | RecordUpdatedPayload
  | RealtimeConnectedPayload
  | RealtimePongPayload
  | { event: string; [key: string]: unknown };

export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
