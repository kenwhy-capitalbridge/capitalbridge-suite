/** Catalog plan keys used by advisory entitlements + Lion access (see `deriveEntitlements` in @cb/advisory-graph). */
export type PlanSlug = "trial" | "monthly" | "quarterly" | "yearly" | "strategic";

/**
 * Normalize a raw DB / RPC plan slug to a catalog plan, or `null` when unknown.
 * Must stay aligned with `normalizePlan` in `@cb/advisory-graph` platformAccess.
 */
export function normalizeAdvisoryPlanSlug(v: unknown): PlanSlug | null {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  const squish = s.replace(/[\s_-]+/g, "");

  if (
    s === "trial" ||
    s === "monthly" ||
    s === "quarterly" ||
    s === "yearly" ||
    s === "strategic"
  )
    return s as PlanSlug;

  if (squish === "yearlyfull" || s === "yearly_full") return "strategic";
  if (squish === "strategic365" || squish === "strategicyearly") return "strategic";

  if (s.includes("strategic")) return "strategic";

  /** Event / campaign guided passes — same entitlement tier as trial for modelling gates. */
  if (s.startsWith("gitex_")) return "trial";

  return null;
}

/**
 * Plan slugs that omit The Lion's Verdict (trial-equivalent): explicit `trial`, `gitex_*`,
 * empty/unknown slugs (same default as `deriveEntitlements` → trial).
 */
export function planSlugDeniesLionsVerdict(slug: string | null | undefined): boolean {
  const p = normalizeAdvisoryPlanSlug(slug);
  return p === null || p === "trial";
}
