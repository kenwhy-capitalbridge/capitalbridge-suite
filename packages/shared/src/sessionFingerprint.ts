/**
 * Session identifier for user_active_session: Supabase JWT `session_id` claim only.
 * Works in Edge (middleware) and Node (API routes).
 */

/** Stale rows are ignored so users are not blocked by old session markers. */
export const USER_ACTIVE_SESSION_TTL_MS = 30 * 60 * 1000;

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const json = atob(base64 + pad);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Primary session identifier: JWT `session_id` (Supabase Auth).
 * Do not use hashed access tokens — they rotate and cause false mismatches.
 */
export function getJwtSessionIdFromAccessToken(accessToken: string): string | null {
  const payload = decodeJwtPayload(accessToken);
  if (payload?.session_id && typeof payload.session_id === "string" && payload.session_id.length > 0) {
    return payload.session_id;
  }
  return null;
}

/**
 * True if updated_at is missing or older than USER_ACTIVE_SESSION_TTL_MS.
 */
export function isUserActiveSessionStale(updatedAt: string | null | undefined): boolean {
  if (updatedAt == null || updatedAt === "") return true;
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t > USER_ACTIVE_SESSION_TTL_MS;
}
