type RecoveryAuditEvent =
  | "token_mint_ok"
  | "token_mint_denied"
  | "token_mint_rate_limited"
  | "recover_attempt"
  | "recover_ok"
  | "recover_denied"
  | "recover_rate_limited"
  | "recover_token_invalid"
  | "recover_token_expired"
  | "recover_mismatch"
  | "recover_payment_missing"
  | "recover_error"
  | "password_setup_bill_ok"
  | "password_setup_bill_denied"
  | "password_setup_bill_rate_limited";

export function recoveryAudit(
  event: RecoveryAuditEvent,
  meta: Record<string, string | number | boolean | undefined | null>
): void {
  const line = JSON.stringify({
    channel: "payment_email_recovery",
    event,
    ts: new Date().toISOString(),
    ...meta,
  });
  if (event.endsWith("denied") || event.endsWith("invalid") || event.includes("rate") || event === "recover_error") {
    console.warn(`[recovery-audit] ${line}`);
  } else {
    console.info(`[recovery-audit] ${line}`);
  }
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Require browser same-origin for recovery endpoints (mitigate cross-site token mint).
 */
export function isAllowedRecoveryOrigin(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  const base =
    process.env.NEXT_PUBLIC_LOGIN_APP_URL?.replace(/\/$/, "") ||
    process.env.LOGIN_APP_URL?.replace(/\/$/, "") ||
    "";
  if (!base) return false;
  let allowedOrigin: string;
  try {
    allowedOrigin = new URL(base).origin;
  } catch {
    return false;
  }
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === allowedOrigin;
    } catch {
      return false;
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === allowedOrigin;
    } catch {
      return false;
    }
  }
  return false;
}
