import type { Tier } from "@cb/lion-verdict/copy";

export type VerdictTier = Tier;

const VERDICT_TIERS = new Set<string>(["STRONG", "STABLE", "FRAGILE", "AT_RISK", "NOT_SUSTAINABLE"]);

/**
 * True only when lion_config already has server-chosen paid Lion lines (not `{}` / partial).
 */
export function isLionConfigChosen(
  v: unknown,
): v is {
  verdictTier: VerdictTier;
  headlineIndex: number;
  guidanceIndex: number;
  headlineText: string;
  guidanceText: string;
} {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  const vt = o.verdictTier;
  if (typeof vt !== "string" || !VERDICT_TIERS.has(vt)) return false;
  if (typeof o.headlineIndex !== "number" || !Number.isInteger(o.headlineIndex)) return false;
  if (typeof o.guidanceIndex !== "number" || !Number.isInteger(o.guidanceIndex)) return false;
  if (typeof o.headlineText !== "string" || o.headlineText.trim().length === 0) return false;
  if (typeof o.guidanceText !== "string" || o.guidanceText.trim().length === 0) return false;
  return true;
}
