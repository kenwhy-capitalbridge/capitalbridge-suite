/**
 * Prefer first + last name from `profiles`; otherwise same fallbacks as `initialsFromDisplayName`.
 */
export function initialsFromFirstLastOrFallback(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const f = firstName?.trim();
  const l = lastName?.trim();
  if (f && l) {
    const a = f[0];
    const b = l[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  if (f && !l) {
    return f.length >= 2 ? f.slice(0, 2).toUpperCase() : f.toUpperCase();
  }
  if (l && !f) {
    return l.length >= 2 ? l.slice(0, 2).toUpperCase() : l.toUpperCase();
  }
  return initialsFromDisplayName(displayName, email);
}

/** Two-letter (or one) initials for header avatar and profile chrome. */
export function initialsFromDisplayName(
  fullName: string | null | undefined,
  email: string | null | undefined
): string {
  const n = fullName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]![0];
      const b = parts[parts.length - 1]![0];
      if (a && b) return `${a}${b}`.toUpperCase();
    }
    if (parts.length === 1) {
      const w = parts[0]!;
      if (w.length >= 2) return w.slice(0, 2).toUpperCase();
      if (w.length === 1) return w.toUpperCase();
    }
  }
  const e = email?.trim();
  if (e) {
    const local = e.split("@")[0] ?? "";
    const alnum = local.replace(/[^a-zA-Z0-9]/g, "");
    if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase();
    if (alnum.length === 1) return `${alnum}`.toUpperCase();
    return e.slice(0, 2).toUpperCase();
  }
  return "?";
}

export function formatPlanLabel(slug: string | null | undefined): string {
  if (!slug?.trim()) return "Standard";
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
