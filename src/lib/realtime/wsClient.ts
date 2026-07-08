import { buildNotificationsWsUrl } from "./buildWsUrl";
import { dispatchRecordUpdated } from "./recordUpdatedBus";
import type { RealtimePayload } from "./types";

type MessageHandler = (payload: RealtimePayload) => void;
type StatusHandler = (status: "connecting" | "connected" | "disconnected" | "error") => void;

const MAX_RECONNECT_DELAY_MS = 30_000;
const PING_INTERVAL_MS = 25_000;

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
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.onStatus("disconnected");
  }

  reconnect(): void {
    if (!this.shouldRun) return;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
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
    this.pingTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send("ping");
      }
    }, PING_INTERVAL_MS);
  }

  private handlePayload(payload: RealtimePayload): void {
    this.onMessage(payload);
    if (payload.event === "record_updated") {
      dispatchRecordUpdated(payload);
    }
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
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.onStatus("connected");
        this.startPing();
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as RealtimePayload;
          this.handlePayload(payload);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onerror = () => {
        this.onStatus("error");
      };

      socket.onclose = () => {
        this.socket = null;
        if (this.pingTimer != null) {
          window.clearInterval(this.pingTimer);
          this.pingTimer = null;
        }
        if (!this.shouldRun) {
          this.onStatus("disconnected");
          return;
        }
        this.onStatus("disconnected");
        this.scheduleReconnect();
      };
    } catch {
      this.onStatus("error");
      this.scheduleReconnect();
    }
  }
}
