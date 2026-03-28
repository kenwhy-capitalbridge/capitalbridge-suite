import { createHmac } from "node:crypto";

/** Pepper must be set in production so IP hashes are not guessable. */
function trialCheckoutPepper(): string {
  return process.env.TRIAL_CHECKOUT_PEPPER ?? "dev-only-trial-pepper-change-in-production";
}

export function parseClientIpFromRequest(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return null;
}

export function hashTrialCheckoutIp(clientIp: string | null): string | null {
  if (!clientIp) return null;
  const normalized = clientIp.trim().toLowerCase();
  if (!normalized) return null;
  return createHmac("sha256", trialCheckoutPepper()).update(normalized).digest("hex");
}
