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

export type LeadCalledBackPayload = {
  event: "lead_called_back";
  record_id: string;
  entity_type: string;
  lead_name?: string | null;
  phone_number?: string | null;
  praja_id?: string | null;
  assigned_to?: string | null;
  wati_chatbot_call_received?: boolean;
  /** DB id from in_app_notifications — used for mark-as-read */
  notification_id?: number | null;
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
  | LeadCalledBackPayload
  | RealtimeConnectedPayload
  | RealtimePongPayload
  | { event: string; [key: string]: unknown };

export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
