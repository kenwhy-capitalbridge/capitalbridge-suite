/**
 * Attempt-based lock (smartphone-style). In-process; best-effort per server instance.
 * Keys are normalized email or logical keys like "resend:email".
 */

export type SmartLockKind = "login" | "password_setup" | "resend" | "email_mismatch";

const locks = new Map<string, { failures: number; lockUntilMs: number }>();

function key(kind: SmartLockKind, email: string): string {
  return `${kind}:${email.trim().toLowerCase()}`;
}

function lockDurationMs(failures: number): number {
  if (failures >= 7) return 5 * 60 * 1000;
  if (failures >= 5) return 90 * 1000;
  if (failures >= 3) return 30 * 1000;
  return 0;
}

export function smartLockStatus(kind: SmartLockKind, email: string): {
  locked: boolean;
  lockUntilMs: number;
  failures: number;
  message: string;
  attemptsHint: string;
} {
  const k = key(kind, email);
  const row = locks.get(k) ?? { failures: 0, lockUntilMs: 0 };
  const now = Date.now();
  const locked = row.lockUntilMs > now;
  const waitSec =
    locked && row.lockUntilMs > now ? Math.max(1, Math.ceil((row.lockUntilMs - now) / 1000)) : 0;
  const message = locked && waitSec > 0 ? `Too many attempts. Try again in ${waitSec} seconds` : "";
  const attemptsHint = "";
  return {
    locked,
    lockUntilMs: row.lockUntilMs,
    failures: row.failures,
    message,
    attemptsHint,
  };
}

export function smartLockRecordFailure(kind: SmartLockKind, email: string): void {
  const k = key(kind, email);
  const prev = locks.get(k) ?? { failures: 0, lockUntilMs: 0 };
  const failures = prev.failures + 1;
  const dur = lockDurationMs(failures);
  const lockUntilMs = dur > 0 ? Date.now() + dur : 0;
  locks.set(k, { failures, lockUntilMs });
}

export function smartLockRecordSuccess(kind: SmartLockKind, email: string): void {
  locks.delete(key(kind, email));
}

export const SMART_LOCK_MESSAGES = {
  wait: "Too many attempts. Try again in 30 seconds",
} as const;
