/** Date and time for PDF / report covers (en-GB, 24h). */
export function formatReportGeneratedAtLabel(d: Date = new Date()): string {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function reportPreparedForLine(displayName: string): string {
  const n = String(displayName ?? "").trim();
  return n ? `Prepared for: ${n}` : "Prepared for: Client";
}

export type ReportClientNameParts = {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
};

/** Prefer first + last; then full name; then email; else "Client". */
export function reportClientDisplayName(parts: ReportClientNameParts): string {
  const f = String(parts.firstName ?? "").trim();
  const l = String(parts.lastName ?? "").trim();
  const combined = [f, l].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  const full = String(parts.fullName ?? "").trim();
  if (full) return full;
  const e = String(parts.email ?? "").trim();
  if (e) return e;
  return "Client";
}

export function reportClientDisplayNameFromAuth(args: {
  email: string | null | undefined;
  userMetadata: Record<string, unknown> | null | undefined;
  profile: { first_name: string | null; last_name: string | null } | null | undefined;
}): string {
  const m = args.userMetadata;
  const firstFromMeta = m && typeof m.first_name === "string" ? m.first_name : undefined;
  const lastFromMeta = m && typeof m.last_name === "string" ? m.last_name : undefined;
  const fullFromMeta =
    m && typeof m.full_name === "string"
      ? m.full_name
      : m && typeof m.name === "string"
        ? m.name
        : undefined;
  return reportClientDisplayName({
    firstName: args.profile?.first_name ?? firstFromMeta,
    lastName: args.profile?.last_name ?? lastFromMeta,
    fullName: fullFromMeta,
    email: args.email,
  });
}
