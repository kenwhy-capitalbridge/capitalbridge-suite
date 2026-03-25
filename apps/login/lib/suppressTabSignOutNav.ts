const KEY = "cb_suppress_tab_signout_until";

/** Call immediately before a full navigation that must keep Supabase cookies (e.g. to platform). */
export function suppressTabSignOutForAuthNavigation(ms = 12_000) {
  try {
    sessionStorage.setItem(KEY, String(Date.now() + ms));
  } catch {
    /* ignore */
  }
}

/** True while a recent auth handoff navigation is in progress — skip tab-close sign-out. */
export function shouldSuppressTabSignOut(): boolean {
  try {
    const v = sessionStorage.getItem(KEY);
    if (!v) return false;
    const until = Number(v);
    if (!Number.isFinite(until)) {
      sessionStorage.removeItem(KEY);
      return false;
    }
    if (Date.now() < until) return true;
    sessionStorage.removeItem(KEY);
    return false;
  } catch {
    return false;
  }
}
