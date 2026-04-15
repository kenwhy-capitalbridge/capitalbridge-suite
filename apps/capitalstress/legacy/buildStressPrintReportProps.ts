/**
 * Single source for live dashboard `PrintReport` props (dashboard render + Playwright PDF snapshot).
 */

import { formatCurrencyDisplayNoDecimals } from "@cb/shared/formatCurrency";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import type { CapitalTimelinePrintPayload } from "@cb/advisory-graph/reports";
import type { LionStressAdvisoryInputs } from "@cb/advisory-graph/lionsVerdict";
import {
  getKeyTakeaways,
  getMicroDiagnosticSignals,
  getRecommendedAdjustments,
  runLionVerdictEngineStress,
  toVerdictNarrative,
} from "./services/advisory_engine";
import type { DepletionBarOutput } from "./DepletionBarContext";
import type { PrintReportProps } from "./PrintReport";
import type { MonteCarloResult, StressScenarioResult } from "./types";

type CapitalHealthStatus = "Strong" | "Stable" | "Watchful" | "Needs Attention" | "Critical";
type FragilityIndexTier = "FORTIFIED" | "Highly Robust" | "Stable" | "Fragile" | "Critical";

function getFragilityIndexTier(score: number): FragilityIndexTier {
  if (score <= 20) return "FORTIFIED";
  if (score <= 40) return "Highly Robust";
  if (score <= 60) return "Stable";
  if (score <= 80) return "Fragile";
  return "Critical";
}

function getCapitalHealthStatus(
  tier: string,
  fiTier: FragilityIndexTier,
  depletionPill: string,
): CapitalHealthStatus {
  const depBad =
    depletionPill === "Critical" || depletionPill === "Fragile" || depletionPill === "Vulnerable";
  const fiBad = fiTier === "Critical" || fiTier === "Fragile";
  if (tier === "Critical" || depletionPill === "Critical" || fiTier === "Critical") return "Critical";
  const badCount = (tier === "Weak" ? 1 : 0) + (fiBad ? 1 : 0) + (depBad ? 1 : 0);
  if (badCount >= 2) return "Needs Attention";
  if (badCount === 1 || tier === "Moderate") return "Watchful";
  if (tier === "Strong" || tier === "Very Strong")
    return depletionPill === "Stable" && (fiTier === "FORTIFIED" || fiTier === "Highly Robust")
      ? "Strong"
      : "Stable";
  return "Stable";
}

export type BuildStressPrintReportPropsArgs = {
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
  adjustmentResults: PrintReportProps["adjustmentResults"];
  selectedCurrency: { label: string; code: string; locale: string };
  canSeeVerdict: boolean;
  lionAccessEnabled: boolean;
  reportClientDisplayName: string;
  auditMeta: ReportAuditMeta | null;
  capitalTimelinePrintPayload: CapitalTimelinePrintPayload | null;
  hasStrategicInterest: boolean;
};

export function buildStressPrintReportProps(args: BuildStressPrintReportPropsArgs): PrintReportProps {
  const formatCurrency = (val: number) => formatCurrencyDisplayNoDecimals(val, args.selectedCurrency.code);
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;
  const formatPercentSmall = (val: number) => `${val.toFixed(2)}%`;
  const formatSignedPct = (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;

  const returnRange = args.upperPct - args.lowerPct;
  const returnSens = Math.min(100, Math.max(0, (returnRange - 5) * 10));
  const withdrawalSens =
    args.investment > 0 ? Math.min(100, (args.withdrawal / args.investment) * 500) : 0;
  const inflationSens = Math.min(100, args.effectiveInflation * 25);
  const volSens = Math.min(100, args.mcResult.maxDrawdownPctAvg * 2);
  const drawdownSens = Math.min(100, args.mcResult.maxDrawdownPctAvg * 2.5);
  const fragilityIndex = Math.round(
    (returnSens + withdrawalSens + inflationSens + volSens + drawdownSens) / 5,
  );
  const fiTier = getFragilityIndexTier(fragilityIndex);
  const depletionPill = args.depletionBarOutput?.pillLabel ?? "Stable";
  const healthStatus = getCapitalHealthStatus(args.mcResult.tier, fiTier, depletionPill);

  const advisoryInputs: LionStressAdvisoryInputs = {
    capitalResilienceScore: args.mcResult.capitalResilienceScore,
    tier: args.mcResult.tier,
    fragilityIndicator: depletionPill,
    initialCapital: args.investment,
    withdrawalAmount: args.withdrawal,
    timeHorizonYears: args.years,
    simulatedAverageOutcome: args.mcResult.simulatedAverage,
    maximumDrawdownPct: args.mcResult.maxDrawdownPctAvg,
    worstCaseOutcome: args.mcResult.percentile5,
  };

  const lionEnginePrint =
    args.canSeeVerdict && args.lionAccessEnabled
      ? runLionVerdictEngineStress(advisoryInputs, formatCurrency)
      : null;
  const verdict = lionEnginePrint ? toVerdictNarrative(lionEnginePrint) : null;

  return {
    mcResult: args.mcResult,
    depletionBarOutput: args.depletionBarOutput,
    investment: args.investment,
    withdrawal: args.withdrawal,
    years: args.years,
    confidence: args.confidence,
    lowerPct: args.lowerPct,
    upperPct: args.upperPct,
    effectiveInflation: args.effectiveInflation,
    stressScenarioResults: args.stressScenarioResults,
    adjustmentResults: args.adjustmentResults,
    formatCurrency,
    formatPercent,
    formatPercentSmall,
    formatSignedPct,
    healthStatus,
    fragilityIndex,
    fiTier,
    verdict,
    lionVerdictOutput: lionEnginePrint,
    lionAccessEnabled: args.lionAccessEnabled,
    stressAdvisoryInputs: args.canSeeVerdict ? advisoryInputs : null,
    keyTakeaways: args.canSeeVerdict ? getKeyTakeaways(advisoryInputs) : [],
    recommendedAdjustments: args.canSeeVerdict ? getRecommendedAdjustments(advisoryInputs) : [],
    microSignals: args.canSeeVerdict ? getMicroDiagnosticSignals(advisoryInputs) : [],
    medianPathYearly: args.mcResult.medianPathYearly,
    reportClientDisplayName: args.reportClientDisplayName,
    auditMeta: args.auditMeta,
    capitalTimelinePrintPayload: args.capitalTimelinePrintPayload,
    hasStrategicInterest: args.hasStrategicInterest,
  };
}
