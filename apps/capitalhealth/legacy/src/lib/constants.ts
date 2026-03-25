/** Return bands for solver chip ordering and gating (decision framework). */
export const LOW_RETURN_OK_PCT = 10;       // ≤10% p.a. = broadly "balanced", show Return first
export const MID_RETURN_WARN_PCT = 15;     // 10–15% = show ⚠️, still allow, put Capital/Top-up first
export const HIGH_RETURN_BLOCK_PCT = 15;   // >15% = deprioritize/hide Return, lead with Capital/Top-up

/** @deprecated Use MID_RETURN_WARN_PCT or HIGH_RETURN_BLOCK_PCT. */
export const HIGH_RETURN_WARNING_THRESHOLD_PCT = MID_RETURN_WARN_PCT;

/** Treat money deltas below this as "same" for disabling Apply chip (no-op). */
export const EPS_MONEY = 50;

/** Treat return deltas below this (% points) as "same" for disabling Apply chip. */
export const EPS_RETURN = 0.05;

export type ReturnSuggestionClass = 'invalid' | 'ok' | 'warn' | 'block';

/**
 * Classify a required return recommendation for solver chip ordering and UX.
 * ok: ≤ LOW_RETURN_OK (realistic); warn: up to MID_RETURN_WARN (⚠️); block: above (hide or disable).
 */
export function classifyReturnSuggestion(reqPct: number): ReturnSuggestionClass {
  if (!Number.isFinite(reqPct) || reqPct <= 0) return 'invalid';
  if (reqPct <= LOW_RETURN_OK_PCT) return 'ok';
  if (reqPct <= MID_RETURN_WARN_PCT) return 'warn';
  return 'block';
}
