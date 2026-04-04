/**
 * Platform admin gate for internal routes (e.g. strategic interest pipeline).
 * Set PLATFORM_ADMIN_EMAILS (comma-separated) and PLATFORM_ADMIN_PASSWORDS on Vercel;
 * both are required for /admin and /api/admin to respond (otherwise 404).
 */

function adminEmailSet(): Set<string> {
  const listed =
    process.env.PLATFORM_ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  return new Set(listed);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const set = adminEmailSet();
  if (set.size === 0) return false;
  return set.has(email.trim().toLowerCase());
}

/** Ordered list (for aligning PLATFORM_ADMIN_PASSWORDS by index). */
export function platformAdminEmailList(): string[] {
  return (
    process.env.PLATFORM_ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? []
  );
}

/** Admin UI and APIs are disabled unless both env vars are set (edge-safe). */
export function isPlatformAdminSurfaceConfigured(): boolean {
  return platformAdminEmailList().length > 0 && Boolean(process.env.PLATFORM_ADMIN_PASSWORDS?.trim());
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
