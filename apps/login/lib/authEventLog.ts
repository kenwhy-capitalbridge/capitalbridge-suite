/**
 * Minimal operational logging — no emails, passwords, or tokens. Best-effort only.
 */

export type AuthEventName =
  | "login_attempt"
  | "login_failed"
  | "email_sent"
  | "membership_created"
  | "membership_self_healed"
  | "session_conflict"
  | "email_mismatch"
  | "membership_check_error"
  | "safe_mode_entered";

export function authEventLog(
  event: AuthEventName,
  meta: Record<string, string | number | boolean | undefined> = {}
): void {
  try {
    console.info(
      JSON.stringify({
        channel: "auth_event",
        event,
        ts: new Date().toISOString(),
        ...meta,
      })
    );
  } catch {
    /* ignore */
  }
}

/** Passive anomaly signal — does not block users. */
export function authAnomalyFlag(kind: string, meta: Record<string, string | number | undefined> = {}): void {
  try {
    console.warn(
      JSON.stringify({
        channel: "auth_anomaly",
        kind,
        ts: new Date().toISOString(),
        ...meta,
      })
    );
  } catch {
    /* ignore */
  }
}
