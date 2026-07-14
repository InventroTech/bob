import { getAccessToken } from "@/lib/auth/accessTokenProvider";

export function buildNotificationsWsUrl(): string | null {
  const token = getAccessToken();
  if (!token) return null;

  // Prefer a dedicated WebSocket base (the Daphne/ASGI service, which is a
  // separate host from the HTTP API when using a two-service split).
  // Falls back to deriving the WS base from the HTTP API base for local dev.
  const explicitWsBase = import.meta.env.VITE_WS_URL || import.meta.env.VITE_WS_BASE_URL;

  const rawBase =
    explicitWsBase ||
    import.meta.env.VITE_RENDER_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000";

  // http -> ws, https -> wss; an explicit ws(s):// base is left untouched.
  const wsBase = rawBase.replace(/\/+$/, "").replace(/^http/i, "ws");
  return `${wsBase}/ws/notifications/?token=${encodeURIComponent(token)}`;
}
