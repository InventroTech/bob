import { buildNotificationsWsUrl } from "./buildWsUrl";
import { dispatchRecordUpdated } from "./recordUpdatedBus";
import type { RealtimePayload, RecordUpdatedPayload } from "./types";

type MessageHandler = (payload: RealtimePayload) => void;
type StatusHandler = (status: "connecting" | "connected" | "disconnected" | "error") => void;

const MAX_RECONNECT_DELAY_MS = 30_000;
const PING_INTERVAL_MS = 25_000;

function detachSocket(socket: WebSocket | null): void {
  if (!socket) return;
  socket.onopen = null;
  socket.onmessage = null;
  socket.onerror = null;
  socket.onclose = null;
}

/** Drop the full CRM JSONB blob; keep only fields the UI actually reads. */
function slimRecordUpdated(payload: RecordUpdatedPayload): RecordUpdatedPayload {
  const raw = payload.data;
  let data: Record<string, unknown> | undefined;
  if (raw && typeof raw === "object") {
    const tasks = (raw as { tasks?: unknown }).tasks;
    const reject_reason = (raw as { reject_reason?: unknown }).reject_reason;
    if (tasks !== undefined || reject_reason !== undefined) {
      data = {};
      if (tasks !== undefined) data.tasks = tasks;
      if (reject_reason !== undefined) data.reject_reason = reject_reason;
    }
  }
  return {
    event: "record_updated",
    record_id: payload.record_id,
    entity_type: payload.entity_type,
    lead_stage: payload.lead_stage,
    assigned_to: payload.assigned_to,
    created: payload.created,
    updated_at: payload.updated_at,
    ...(data ? { data } : {}),
  };
}

export class NotificationsWsClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private reconnectAttempts = 0;
  private shouldRun = false;
  private onMessage: MessageHandler;
  private onStatus: StatusHandler;

  constructor(handlers: { onMessage?: MessageHandler; onStatus?: StatusHandler } = {}) {
    this.onMessage = handlers.onMessage ?? (() => undefined);
    this.onStatus = handlers.onStatus ?? (() => undefined);
  }

  start(): void {
    this.shouldRun = true;
    this.connect();
  }

  stop(): void {
    this.shouldRun = false;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    detachSocket(socket);
    socket?.close();
    this.onStatus("disconnected");
  }

  reconnect(): void {
    if (!this.shouldRun) return;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    detachSocket(socket);
    socket?.close();
    this.connect();
  }

  private clearTimers(): void {
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer != null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldRun) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  private startPing(): void {
    if (this.pingTimer != null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.pingTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send("ping");
      }
    }, PING_INTERVAL_MS);
  }

  private handlePayload(payload: RealtimePayload): void {
    if (payload.event !== "record_updated") return;
    dispatchRecordUpdated(slimRecordUpdated(payload as RecordUpdatedPayload));
  }

  private connect(): void {
    if (!this.shouldRun) return;

    const url = buildNotificationsWsUrl();
    if (!url) {
      this.onStatus("disconnected");
      return;
    }

    this.clearTimers();
    this.onStatus("connecting");

    try {
      detachSocket(this.socket);
      this.socket?.close();

      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        if (this.socket !== socket) return;
        this.reconnectAttempts = 0;
        this.onStatus("connected");
        this.startPing();
      };

      socket.onmessage = (event) => {
        if (this.socket !== socket) return;
        const raw = String(event.data);
        if (raw === "pong" || raw === "ping") return;
        try {
          const payload = JSON.parse(raw) as RealtimePayload;
          this.handlePayload(payload);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onerror = () => {
        if (this.socket !== socket) return;
        this.onStatus("error");
      };

      socket.onclose = () => {
        if (this.socket === socket) {
          this.socket = null;
        }
        this.clearTimers();
        if (!this.shouldRun) {
          this.onStatus("disconnected");
          return;
        }
        if (this.socket != null) return;
        this.onStatus("disconnected");
        this.scheduleReconnect();
      };
    } catch {
      this.onStatus("error");
      this.scheduleReconnect();
    }
  }
}
