/**
 * Cookie payload: userId + unix expiry (seconds). Edge-safe (no Buffer).
 * Bound in middleware to authenticated user.
 */
export function encodeMembershipSafeCookie(userId: string, expSec: number): string {
  const raw = `${userId}:${expSec}`;
  return btoa(unescape(encodeURIComponent(raw)));
}

export function decodeMembershipSafeCookie(value: string | undefined): { userId: string; expSec: number } | null {
  if (!value) return null;
  try {
    const raw = decodeURIComponent(escape(atob(value)));
    const idx = raw.lastIndexOf(":");
    if (idx <= 0) return null;
    const userId = raw.slice(0, idx);
    const expSec = parseInt(raw.slice(idx + 1), 10);
    if (!userId || !Number.isFinite(expSec)) return null;
    return { userId, expSec };
  } catch {
    return null;
  }
}

/** Safe mode window when membership DB check fails transiently (seconds). */
export const MEMBERSHIP_SAFE_MODE_SEC = 600;
