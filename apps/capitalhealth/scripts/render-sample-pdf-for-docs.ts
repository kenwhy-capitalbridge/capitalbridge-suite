/**
 * Writes docs/samples/capital-health-report.pdf at repo root (design review).
 * Run from repo root: npx tsx apps/capitalhealth/scripts/render-sample-pdf-for-docs.ts
 *
 * Embeds the same bundled PNGs as production (`packages/ui` assets) so the sample PDF matches live exports.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CURRENCIES, PRESETS, type CalculatorInputs } from "../legacy/calculator-types";
import { buildCalculatorResults } from "../legacy/src/hooks/buildCalculatorResults";
import { generateReportBlob } from "../legacy/CapitalGrowthReport";

function pngFileToDataUrl(absPath: string): string | null {
  try {
    const buf = readFileSync(absPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

const sampleInputs: CalculatorInputs = {
  mode: "withdrawal",
  currency: CURRENCIES[0],
  riskPreset: "balanced",
  targetMonthlyIncome: 10000,
  targetFutureCapital: 2_000_000,
  timeHorizonYears: 10,
  startingCapital: 500_000,
  expectedAnnualReturnPct: PRESETS.balanced.annualReturn,
  monthlyTopUp: 0,
  inflationEnabled: false,
  inflationPct: 1.5,
  cashBufferPct: PRESETS.balanced.cashBufferPct,
  cashAPY: PRESETS.balanced.cashAPY,
  reinvestmentSplitPct: PRESETS.balanced.reinvestmentSplitPct,
  withdrawalRule: "fixed",
  withdrawalPctOfCapital: PRESETS.balanced.withdrawalPctOfCapital,
  yieldBoost: "balanced",
};

async function main() {
  const scriptDir = fileURLToPath(new URL(".", import.meta.url));
  const repoRoot = join(scriptDir, "..", "..", "..");
  const fullLockupPng = join(repoRoot, "packages", "ui", "src", "assets", "Full_CapitalBridge_Green.png");
  const footerLogoPng = join(repoRoot, "packages", "ui", "src", "assets", "CapitalBridgeLogo_Green.png");

  const brandFullLockupPngDataUrl = pngFileToDataUrl(fullLockupPng);
  const brandWordmarkPngDataUrl = pngFileToDataUrl(footerLogoPng);

  const result = buildCalculatorResults(sampleInputs);
  const snaps = result.monthlySnapshots;
  const step = Math.max(1, Math.floor(snaps.length / 60)) || 1;
  const chartData = snaps
    .filter((_, i) => i % step === 0)
    .map((s) => ({ month: s.monthIndex, nominal: s.totalCapital }));

  const blob = await generateReportBlob(sampleInputs, result, {
    chartData,
    currentAge: 55,
    brandFullLockupPngDataUrl: brandFullLockupPngDataUrl ?? undefined,
    brandWordmarkPngDataUrl: brandWordmarkPngDataUrl ?? undefined,
  });
  const buf = Buffer.from(await blob.arrayBuffer());

  const outPath = join(repoRoot, "docs", "samples", "capital-health-report.pdf");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
