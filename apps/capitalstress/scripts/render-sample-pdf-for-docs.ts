/**
 * Renders the Capital Stress print report to docs/samples/capital-stress-report.pdf via Playwright.
 * Requires: npm i at repo root (playwright install chromium if needed: npx playwright install chromium).
 * Run from repo root: npx tsx apps/capitalstress/scripts/render-sample-pdf-for-docs.ts
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LionStressAdvisoryInputs } from "@cb/advisory-graph/lionsVerdict";
import { PrintReport } from "../legacy/PrintReport";
import type { DepletionBarOutput } from "../legacy/DepletionBarContext";
import {
  getKeyTakeaways,
  getMicroDiagnosticSignals,
  getRecommendedAdjustments,
  runLionVerdictEngineStress,
  toVerdictNarrative,
} from "../legacy/services/advisory_engine";
import { getDepletionBarOutput, runMonteCarlo, runStressScenarios } from "../legacy/services/mathUtils";
import type { StressSeverity } from "../legacy/types";

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

const PRINT_CSS = `
  @page { size: A4; margin: 18mm 20mm 22mm; }
  body { margin: 0; background: #fff; color: #0d3a1d; }
  .print-report-root {
    background: #fff !important;
    color: #0d3a1d !important;
    font-size: 11pt;
    line-height: 1.45;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .print-section { page-break-inside: avoid; }
  .print-chart-wrap { page-break-inside: avoid; }
  .print-page-break-before { page-break-before: always; }
`;

async function main() {
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
    extendHorizon: runMonteCarlo(
      investment,
      withdrawal,
      lowerPct,
      upperPct,
      years + 5,
      stressSeverity,
      undefined,
      confidence,
    ),
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

  const markup = renderToStaticMarkup(
    React.createElement(PrintReport, {
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
    }),
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>${PRINT_CSS}</style>
</head>
<body>${markup}</body>
</html>`;

  const scriptDir = fileURLToPath(new URL(".", import.meta.url));
  const repoRoot = join(scriptDir, "..", "..", "..");
  const outPath = join(repoRoot, "docs", "samples", "capital-stress-report.pdf");
  mkdirSync(dirname(outPath), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
    });
  } finally {
    await browser.close();
  }

  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
