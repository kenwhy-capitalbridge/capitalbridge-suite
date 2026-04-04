/** Shared constants + env helpers for the optional platform admin password gate. */

export const CB_PLATFORM_ADMIN_GATE_COOKIE = "cb_pf_admin_gate";
export const CB_PLATFORM_ADMIN_GATE_MAX_AGE_SEC = 12 * 60 * 60; // 12h

export function isAdminPasswordGateEnabled(): boolean {
  return Boolean(process.env.PLATFORM_ADMIN_PASSWORDS?.trim());
}

/**
 * HMAC signing material. Prefer PLATFORM_ADMIN_GATE_SECRET in production; otherwise
 * derived from passwords + admin email list so the cookie secret isn't the raw password.
 */
export function getAdminGateKeyMaterial(): string {
  const explicit = process.env.PLATFORM_ADMIN_GATE_SECRET?.trim();
  if (explicit) return explicit;
  const p = process.env.PLATFORM_ADMIN_PASSWORDS?.trim() ?? "";
  const e = process.env.PLATFORM_ADMIN_EMAILS?.trim() ?? "";
  if (!p) return "";
  return `${p}\n${e}`;
}

export function splitEnvCsv(s: string | undefined): string[] {
  if (!s?.trim()) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
