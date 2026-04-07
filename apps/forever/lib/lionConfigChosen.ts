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

export type ForeverReportLionDisplay = {
  verdictTier: VerdictTier;
  headlineText: string;
  guidanceText: string;
};

/**
 * Paid report-document Lion block: prefer server-chosen lines on `lion_config`, then nested schema-v2 `lion`,
 * then verbatim lines from the stored calculator snapshot (`results.lionCopy`) for older or partial rows.
 */
export function resolveForeverReportDocumentLion(args: {
  isTrial: boolean;
  lionConfig: unknown;
  calculator: { inputs: Record<string, unknown>; results: Record<string, unknown> } | null;
}): ForeverReportLionDisplay | null {
  const { isTrial, lionConfig, calculator } = args;
  if (isTrial) return null;

  if (isLionConfigChosen(lionConfig)) {
    return {
      verdictTier: lionConfig.verdictTier,
      headlineText: lionConfig.headlineText,
      guidanceText: lionConfig.guidanceText,
    };
  }

  const root = lionConfig && typeof lionConfig === "object" && !Array.isArray(lionConfig)
    ? (lionConfig as Record<string, unknown>)
    : null;
  const nested = root?.lion;
  if (nested && typeof nested === "object" && !Array.isArray(nested) && nested !== null) {
    const L = nested as Record<string, unknown>;
    if (L.locked !== true) {
      const vtRaw = (typeof L.verdictTier === "string" ? L.verdictTier : typeof L.tier === "string" ? L.tier : "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");
      const headlineText =
        typeof L.headlineText === "string"
          ? L.headlineText
          : typeof L.headline === "string"
            ? L.headline
            : "";
      const guidanceText =
        typeof L.guidanceText === "string"
          ? L.guidanceText
          : typeof L.guidance === "string"
            ? L.guidance
            : "";
      if (VERDICT_TIERS.has(vtRaw) && headlineText.trim().length > 0 && guidanceText.trim().length > 0) {
        return { verdictTier: vtRaw as VerdictTier, headlineText, guidanceText };
      }
    }
  }

  const lionCopy = calculator?.results?.lionCopy;
  if (lionCopy && typeof lionCopy === "object" && !Array.isArray(lionCopy)) {
    const c = lionCopy as Record<string, unknown>;
    const vtRaw = typeof c.tier === "string" ? c.tier.trim().toUpperCase().replace(/\s+/g, "_") : "";
    const headlineText = typeof c.headline === "string" ? c.headline : "";
    const guidanceText = typeof c.guidance === "string" ? c.guidance : "";
    if (VERDICT_TIERS.has(vtRaw) && headlineText.trim().length > 0 && guidanceText.trim().length > 0) {
      return { verdictTier: vtRaw as VerdictTier, headlineText, guidanceText };
    }
  }

  return null;
}
