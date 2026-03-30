/**
 * Deterministic props for `/docs/sample-report` — same math as the design-review sample PDF pipeline.
 */

import type { LionStressAdvisoryInputs } from "@cb/advisory-graph/lionsVerdict";
import type { PrintReportProps } from "./PrintReport";
import type { DepletionBarOutput } from "./DepletionBarContext";
import {
  getKeyTakeaways,
  getMicroDiagnosticSignals,
  getRecommendedAdjustments,
  runLionVerdictEngineStress,
  toVerdictNarrative,
} from "./services/advisory_engine";
import { getDepletionBarOutput, runMonteCarlo, runStressScenarios } from "./services/mathUtils";
import type { StressSeverity } from "./types";

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
  const depBad = depletionPill === "Critical" || depletionPill === "Fragile" || depletionPill === "Vulnerable";
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

export function buildSampleCapitalStressPrintReportProps(): PrintReportProps {
  const investment = 1_000_000;
  const withdrawal = 50_000;
  const lowerPct = -2.0;
  const upperPct = 7.0;
  const years = 10;
  const confidence = 90;
  const stressSeverity: StressSeverity = "none";
  const effectiveInflation = 1.5;

  const mcResult = runMonteCarlo(
    investment,
    withdrawal,
    lowerPct,
    upperPct,
    years,
    stressSeverity,
    undefined,
    confidence,
  );
  const stressScenarioResults = runStressScenarios(
    investment,
    withdrawal,
    lowerPct,
    upperPct,
    years,
    stressSeverity,
  );
  const adjustmentResults = {
    reduceWithdrawal: runMonteCarlo(
      investment,
      withdrawal * 0.9,
      lowerPct,
      upperPct,
      years,
      stressSeverity,
      undefined,
      confidence,
    ),
    extendHorizon: runMonteCarlo(investment, withdrawal, lowerPct, upperPct, years + 5, stressSeverity, undefined, confidence),
    improveReturns: runMonteCarlo(
      investment,
      withdrawal,
      lowerPct + 1,
      upperPct + 1,
      years,
      stressSeverity,
      undefined,
      confidence,
    ),
  };

  const rawDepletion = getDepletionBarOutput(mcResult.depletionPressurePct);
  const depletionBarOutput: DepletionBarOutput = { ...rawDepletion, instanceId: 0 };

  const returnRange = upperPct - lowerPct;
  const returnSens = Math.min(100, Math.max(0, (returnRange - 5) * 10));
  const withdrawalSens = investment > 0 ? Math.min(100, (withdrawal / investment) * 500) : 0;
  const inflationSens = Math.min(100, effectiveInflation * 25);
  const volSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2);
  const drawdownSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2.5);
  const fragilityIndex = Math.round((returnSens + withdrawalSens + inflationSens + volSens + drawdownSens) / 5);
  const fiTier = getFragilityIndexTier(fragilityIndex);
  const depletionPill = depletionBarOutput.pillLabel;
  const healthStatus = getCapitalHealthStatus(mcResult.tier, fiTier, depletionPill);

  const selectedCurrency = { label: "RM", code: "MYR", locale: "en-MY" };
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(selectedCurrency.locale, {
      style: "currency",
      currency: selectedCurrency.code,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(val);
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;
  const formatPercentSmall = (val: number) => `${val.toFixed(2)}%`;
  const formatSignedPct = (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;

  const advisoryInputs: LionStressAdvisoryInputs = {
    capitalResilienceScore: mcResult.capitalResilienceScore,
    tier: mcResult.tier,
    fragilityIndicator: depletionPill,
    initialCapital: investment,
    withdrawalAmount: withdrawal,
    timeHorizonYears: years,
    simulatedAverageOutcome: mcResult.simulatedAverage,
    maximumDrawdownPct: mcResult.maxDrawdownPctAvg,
    worstCaseOutcome: mcResult.percentile5,
  };

  const lionEnginePrint = runLionVerdictEngineStress(advisoryInputs, formatCurrency);
  const verdict = lionEnginePrint ? toVerdictNarrative(lionEnginePrint) : null;

  return {
    mcResult,
    depletionBarOutput,
    investment,
    withdrawal,
    years,
    confidence,
    lowerPct,
    upperPct,
    effectiveInflation,
    stressScenarioResults,
    adjustmentResults,
    formatCurrency,
    formatPercent,
    formatPercentSmall,
    formatSignedPct,
    healthStatus,
    fragilityIndex,
    fiTier,
    verdict,
    lionVerdictOutput: lionEnginePrint,
    stressAdvisoryInputs: advisoryInputs,
    keyTakeaways: getKeyTakeaways(advisoryInputs),
    recommendedAdjustments: getRecommendedAdjustments(advisoryInputs),
    microSignals: getMicroDiagnosticSignals(advisoryInputs),
    medianPathYearly: mcResult.medianPathYearly,
    reportClientDisplayName: "Sample Client",
  };
}
