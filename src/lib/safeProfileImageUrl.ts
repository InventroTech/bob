/**
 * Value safe to use as an HTML img `src` from untrusted profile fields.
 * Allows http(s) URLs and relative paths; rejects javascript:, data:, etc.
 */
export function safeProfileImageUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const t = url.trim();
  if (t.length === 0) return null;

  const base =
    typeof globalThis !== "undefined" &&
    "location" in globalThis &&
    typeof (globalThis as { location?: { origin?: string } }).location?.origin ===
      "string"
      ? (globalThis as { location: { origin: string } }).location.origin
      : "https://invalid.local";

  try {
    const parsed = new URL(t, base);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:") {
      return t;
    }
    return null;
  } catch {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) {
      return null;
    }
    return t;
  }
}
