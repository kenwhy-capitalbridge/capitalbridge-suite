/**
 * JSON-serializable snapshot for Capital Stress Playwright PDF (vector text, same pipeline as Forever).
 */

import { formatCurrencyDisplayNoDecimals } from "@cb/shared/formatCurrency";
import type { CapitalTimelinePrintPayload } from "@cb/advisory-graph/reports";
import type { LionStressAdvisoryInputs, LionVerdictOutput, VerdictNarrative } from "@cb/advisory-graph/lionsVerdict";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import type { DepletionBarOutput } from "./DepletionBarContext";
import type { PrintReportProps } from "./PrintReport";
import type { MonteCarloResult, StressScenarioResult } from "./types";

export type CapitalHealthStatus = "Strong" | "Stable" | "Watchful" | "Needs Attention" | "Critical";
export type FragilityIndexTier = "FORTIFIED" | "Highly Robust" | "Stable" | "Fragile" | "Critical";

export type StressPrintSnapshotV1 = {
  v: 1;
  mcResult: MonteCarloResult;
  depletionBarOutput: DepletionBarOutput | null;
  investment: number;
  withdrawal: number;
  years: number;
  confidence: number;
  lowerPct: number;
  upperPct: number;
  effectiveInflation: number;
  stressScenarioResults: StressScenarioResult[] | null;
  adjustmentResults: {
    reduceWithdrawal: MonteCarloResult | null;
    extendHorizon: MonteCarloResult | null;
    improveReturns: MonteCarloResult | null;
  } | null;
  currencyCode: string;
  currencyLocale: string;
  currencyLabel: string;
  healthStatus: CapitalHealthStatus;
  fragilityIndex: number;
  fiTier: FragilityIndexTier;
  verdict: VerdictNarrative | null;
  lionVerdictOutput: LionVerdictOutput | null;
  stressAdvisoryInputs: LionStressAdvisoryInputs | null;
  keyTakeaways: string[];
  recommendedAdjustments: string[];
  microSignals: { type: "warn" | "ok"; text: string }[];
  medianPathYearly: number[];
  reportClientDisplayName: string;
  lionAccessEnabled: boolean;
  capitalTimelinePrintPayload: CapitalTimelinePrintPayload | null;
  hasStrategicInterest: boolean;
};

/** Keep PDF payloads small and deterministic without changing visible report structure. */
const MAX_EXPORT_PATHS = 1200;

function compactPathsForExport(paths: MonteCarloResult["paths"]): MonteCarloResult["paths"] {
  if (!Array.isArray(paths) || paths.length === 0) return [];
  if (paths.length <= MAX_EXPORT_PATHS) {
    return paths.map((p) => ({ finalCapital: p.finalCapital })) as MonteCarloResult["paths"];
  }
  const step = paths.length / MAX_EXPORT_PATHS;
  const out: { finalCapital: number }[] = [];
  for (let i = 0; i < MAX_EXPORT_PATHS; i++) {
    const idx = Math.min(paths.length - 1, Math.floor(i * step));
    out.push({ finalCapital: paths[idx]?.finalCapital ?? 0 });
  }
  return out as MonteCarloResult["paths"];
}

function stripMonteCarloResultForExport(mc: MonteCarloResult): MonteCarloResult {
  return {
    ...mc,
    // PDF currently reads only `finalCapital` from `paths`; keep payload compact for report_exports insert.
    paths: compactPathsForExport(mc.paths),
    worstPathYearly: [],
    bestPathYearly: [],
  };
}

export function stripStressSnapshotMonteCarlo(s: StressPrintSnapshotV1): StressPrintSnapshotV1 {
  const adj = s.adjustmentResults;
  return {
    ...s,
    mcResult: stripMonteCarloResultForExport(s.mcResult),
    adjustmentResults: adj
      ? {
          reduceWithdrawal: adj.reduceWithdrawal
            ? stripMonteCarloResultForExport(adj.reduceWithdrawal)
            : null,
          extendHorizon: adj.extendHorizon ? stripMonteCarloResultForExport(adj.extendHorizon) : null,
          improveReturns: adj.improveReturns ? stripMonteCarloResultForExport(adj.improveReturns) : null,
        }
      : null,
  };
}

export function serializeStressPrintProps(
  props: PrintReportProps,
  currency: { code: string; locale: string; label: string },
): StressPrintSnapshotV1 {
  const raw: StressPrintSnapshotV1 = {
    v: 1,
    mcResult: props.mcResult,
    depletionBarOutput: props.depletionBarOutput,
    investment: props.investment,
    withdrawal: props.withdrawal,
    years: props.years,
    confidence: props.confidence,
    lowerPct: props.lowerPct,
    upperPct: props.upperPct,
    effectiveInflation: props.effectiveInflation,
    stressScenarioResults: props.stressScenarioResults,
    adjustmentResults: props.adjustmentResults,
    currencyCode: currency.code,
    currencyLocale: currency.locale,
    currencyLabel: currency.label,
    healthStatus: props.healthStatus,
    fragilityIndex: props.fragilityIndex,
    fiTier: props.fiTier,
    verdict: props.verdict,
    lionVerdictOutput: props.lionVerdictOutput,
    stressAdvisoryInputs: props.stressAdvisoryInputs,
    keyTakeaways: props.keyTakeaways,
    recommendedAdjustments: props.recommendedAdjustments,
    microSignals: props.microSignals,
    medianPathYearly: props.medianPathYearly,
    reportClientDisplayName: props.reportClientDisplayName ?? "Client",
    lionAccessEnabled: props.lionAccessEnabled ?? true,
    capitalTimelinePrintPayload: props.capitalTimelinePrintPayload ?? null,
    hasStrategicInterest: props.hasStrategicInterest ?? false,
  };
  return stripStressSnapshotMonteCarlo(raw);
}

export function buildPrintReportPropsFromSnapshot(
  s: StressPrintSnapshotV1,
  auditMeta: ReportAuditMeta | null,
): PrintReportProps {
  const formatCurrency = (val: number) => formatCurrencyDisplayNoDecimals(val, s.currencyCode);
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;
  const formatPercentSmall = (val: number) => `${val.toFixed(2)}%`;
  const formatSignedPct = (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;

  return {
    mcResult: s.mcResult,
    depletionBarOutput: s.depletionBarOutput,
    investment: s.investment,
    withdrawal: s.withdrawal,
    years: s.years,
    confidence: s.confidence,
    lowerPct: s.lowerPct,
    upperPct: s.upperPct,
    effectiveInflation: s.effectiveInflation,
    stressScenarioResults: s.stressScenarioResults,
    adjustmentResults: s.adjustmentResults,
    formatCurrency,
    formatPercent,
    formatPercentSmall,
    formatSignedPct,
    healthStatus: s.healthStatus,
    fragilityIndex: s.fragilityIndex,
    fiTier: s.fiTier,
    verdict: s.verdict,
    lionVerdictOutput: s.lionVerdictOutput,
    stressAdvisoryInputs: s.stressAdvisoryInputs,
    keyTakeaways: s.keyTakeaways,
    recommendedAdjustments: s.recommendedAdjustments,
    microSignals: s.microSignals,
    medianPathYearly: s.medianPathYearly,
    reportClientDisplayName: s.reportClientDisplayName,
    lionAccessEnabled: s.lionAccessEnabled,
    auditMeta,
    capitalTimelinePrintPayload: s.capitalTimelinePrintPayload,
    hasStrategicInterest: s.hasStrategicInterest,
  };
}

export function isStressPrintSnapshotV1(x: unknown): x is StressPrintSnapshotV1 {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.mcResult === "object" &&
    o.mcResult !== null &&
    typeof o.investment === "number" &&
    typeof o.withdrawal === "number" &&
    typeof o.currencyCode === "string"
  );
}
