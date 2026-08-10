import { getAccessToken } from "@/lib/auth/accessTokenProvider";

export function buildNotificationsWsUrl(explicitToken?: string | null): string | null {
  const token = (explicitToken || getAccessToken() || "").trim();
  if (!token) return null;

  const httpBase = (
    import.meta.env.VITE_RENDER_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  const wsBase = httpBase.replace(/^http/i, "ws");
  return `${wsBase}/ws/notifications/?token=${encodeURIComponent(token)}`;
}
