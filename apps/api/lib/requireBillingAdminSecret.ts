import { timingSafeEqual } from "crypto";

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization")?.trim() ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

export type BillingAdminAuthResult =
  | { ok: true }
  | { ok: false; reason: "misconfigured" | "unauthorized" };

/**
 * Constant-time check for `Authorization: Bearer <BILLING_ADMIN_RECOVERY_SECRET>`.
 * Secret must be at least 32 characters.
 */
export function requireBillingAdminSecret(req: Request): BillingAdminAuthResult {
  const expected = process.env.BILLING_ADMIN_RECOVERY_SECRET?.trim();
  if (!expected || expected.length < 32) {
    return { ok: false, reason: "misconfigured" };
  }

  const provided = extractBearerToken(req);
  if (!provided) {
    return { ok: false, reason: "unauthorized" };
  }

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) {
      return { ok: false, reason: "unauthorized" };
    }
    if (!timingSafeEqual(a, b)) {
      return { ok: false, reason: "unauthorized" };
    }
  } catch {
    return { ok: false, reason: "unauthorized" };
  }

  return { ok: true };
}
