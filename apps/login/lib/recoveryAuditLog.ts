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
  | "password_setup_bill_rate_limited"
  | "access_password_reset_ok"
  | "access_password_reset_denied"
  | "access_password_reset_rate_limited"
  | "password_set_bill_ok"
  | "password_set_bill_denied"
  | "password_set_bill_rate_limited";

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
 * Public URL of this deployment (Vercel / proxies set forwarded headers).
 */
function originFromForwardedHeaders(req: Request): string | null {
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.split(",")[0]?.trim();
  if (!host) return null;
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return null;
  }
}

/**
 * Require browser requests to match an allowed origin (mitigate cross-site abuse).
 * Allows: configured LOGIN URL, this handler's URL origin, and forwarded Host
 * (fixes prod when env points at a different host than login.* or env is unset).
 */
export function isAllowedRecoveryOrigin(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const allowed = new Set<string>();

  const base =
    process.env.NEXT_PUBLIC_LOGIN_APP_URL?.replace(/\/$/, "") ||
    process.env.LOGIN_APP_URL?.replace(/\/$/, "") ||
    "";
  if (base) {
    try {
      allowed.add(new URL(base).origin);
    } catch {
      /* ignore */
    }
  }

  try {
    const u = new URL(req.url);
    if (u.origin && u.origin !== "null") {
      allowed.add(u.origin);
    }
  } catch {
    /* ignore */
  }

  const forwarded = originFromForwardedHeaders(req);
  if (forwarded) {
    allowed.add(forwarded);
  }

  if (allowed.size === 0) {
    return false;
  }

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return allowed.has(new URL(origin).origin);
    } catch {
      return false;
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return false;
}
