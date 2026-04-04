/**
 * Platform admin gate for internal routes (e.g. strategic interest pipeline).
 * Set PLATFORM_ADMIN_EMAILS (comma-separated) or STRATEGIC_INTEREST_ADMIN_EMAIL as fallback.
 */

function adminEmailSet(): Set<string> {
  const listed =
    process.env.PLATFORM_ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (listed.length > 0) return new Set(listed);
  const fallback = process.env.STRATEGIC_INTEREST_ADMIN_EMAIL?.trim().toLowerCase();
  return fallback ? new Set([fallback]) : new Set();
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const set = adminEmailSet();
  if (set.size === 0) return false;
  return set.has(email.trim().toLowerCase());
}

/** Ordered list (for aligning PLATFORM_ADMIN_PASSWORDS by index). */
export function platformAdminEmailList(): string[] {
  const listed =
    process.env.PLATFORM_ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (listed.length > 0) return listed;
  const fallback = process.env.STRATEGIC_INTEREST_ADMIN_EMAIL?.trim().toLowerCase();
  return fallback ? [fallback] : [];
}

export const STRATEGIC_INTEREST_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "matched",
  "onboarded",
] as const;

export type StrategicInterestStatus = (typeof STRATEGIC_INTEREST_STATUSES)[number];

export function isStrategicInterestStatus(s: string): s is StrategicInterestStatus {
  return (STRATEGIC_INTEREST_STATUSES as readonly string[]).includes(s);
}
