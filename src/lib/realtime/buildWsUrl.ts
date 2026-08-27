import { getAccessToken } from "@/lib/auth/accessTokenProvider";

export function buildNotificationsWsUrl(): string | null {
  if (import.meta.env.VITE_ENABLE_REALTIME === "false") return null;

  const token = getAccessToken();
  if (!token) return null;

  // Prefer dedicated WS host (e.g. Daphne on Render). Fall back to API URL for local.
  const httpBase = (
    import.meta.env.VITE_WS_URL ||
    import.meta.env.VITE_RENDER_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  const wsBase = httpBase.replace(/^http/i, "ws");
  return `${wsBase}/ws/notifications/?token=${encodeURIComponent(token)}`;
}
