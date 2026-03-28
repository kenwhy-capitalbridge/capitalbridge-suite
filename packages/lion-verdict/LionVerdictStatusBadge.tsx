"use client";

import type { Tier } from "./copy";

const VERDICT_BADGE: Record<Tier, { bg: string; fg: string; label: string }> = {
  STRONG: { bg: "#55B685", fg: "#FFFFFF", label: "STRONG" },
  STABLE: { bg: "#8FCF7A", fg: "#0D3A1D", label: "STABLE" },
  FRAGILE: { bg: "#F3AF56", fg: "#0D3A1D", label: "FRAGILE" },
  AT_RISK: { bg: "#CFCBBF", fg: "#0D3A1D", label: "AT RISK" },
  NOT_SUSTAINABLE: { bg: "#CD5B52", fg: "#FFFFFF", label: "NOT SUSTAINABLE" },
};

/** Normalise UI / API strings to a verdict tier, if recognised. */
export function parseVerdictTierKey(raw: string): Tier | null {
  const compact = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (compact === "AT_RISK") return "AT_RISK";
  if (compact === "NOT_SUSTAINABLE") return "NOT_SUSTAINABLE";
  if (compact === "STRONG" || compact === "STABLE" || compact === "FRAGILE") return compact as Tier;
  return null;
}

type LionVerdictStatusBadgeProps = {
  tierLabel: string;
  className?: string;
};

/**
 * Rounded status chip for THE LION'S VERDICT header. Unknown labels (e.g. TRIAL) use a neutral pill.
 */
export function LionVerdictStatusBadge({ tierLabel, className = "" }: LionVerdictStatusBadgeProps) {
  const tier = parseVerdictTierKey(tierLabel);
  if (!tier) {
    const text = tierLabel.replaceAll("_", " ").toUpperCase();
    return (
      <span
        className={`inline-flex max-w-full items-center rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90 ${className}`}
      >
        {text}
      </span>
    );
  }
  const { bg, fg, label } = VERDICT_BADGE[tier];
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${className}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

export function LionVerdictScoreLine({ score }: { score?: number | null }) {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return (
    <p className="m-0 text-[11px] font-semibold tabular-nums tracking-wide text-white/90">
      <span className="text-white/75">Verdict Score=</span>{" "}
      <span className="font-bold text-[#FFCC6A]">{Math.round(score)}</span>
    </p>
  );
}
