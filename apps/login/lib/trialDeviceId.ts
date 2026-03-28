const STORAGE_KEY = "cb_trial_did";
const COOKIE_NAME = "cb_trial_did";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * Stable first-party id for trial checkout (localStorage + cookie fallback).
 * Sent with /api/bill/request so the API can tie one trial per browser profile.
 */
export function getOrCreateTrialDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const fromLs = window.localStorage.getItem(STORAGE_KEY);
    if (fromLs && fromLs.length >= 8) return fromLs;
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    const fromCk = match?.[1] ? decodeURIComponent(match[1]) : "";
    const id = fromCk.length >= 8 ? fromCk : crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    return id;
  } catch {
    return "";
  }
}
