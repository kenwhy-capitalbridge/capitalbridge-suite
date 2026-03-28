/**
 * Writes docs/samples/capital-health-report.pdf at repo root (design review).
 * Run from repo root: npx tsx apps/capitalhealth/scripts/render-sample-pdf-for-docs.ts
 *
 * Embeds green brand marks as PNG data URLs (no dev server) so the cover matches the in-app PDF.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CURRENCIES, PRESETS, type CalculatorInputs } from "../legacy/calculator-types";
import { buildCalculatorResults } from "../legacy/src/hooks/buildCalculatorResults";
import { generateReportBlob } from "../legacy/CapitalGrowthReport";

const WORDMARK_RASTER_W = Math.ceil((90 * 568.703125) / 114.5);

async function svgFileToPngDataUrl(absPath: string, width: number, height: number): Promise<string | null> {
  try {
    const buf = await sharp(readFileSync(absPath))
      .resize(width, height, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
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
  const uiAssets = join(repoRoot, "packages", "ui", "src", "assets");

  const [brandLionPngDataUrl, brandWordmarkPngDataUrl] = await Promise.all([
    svgFileToPngDataUrl(join(uiAssets, "lionhead_Green.svg"), 128, 128),
    svgFileToPngDataUrl(join(uiAssets, "CapitalBridgeLogo_Green.svg"), WORDMARK_RASTER_W, 90),
  ]);

  const result = buildCalculatorResults(sampleInputs);
  const snaps = result.monthlySnapshots;
  const step = Math.max(1, Math.floor(snaps.length / 60)) || 1;
  const chartData = snaps
    .filter((_, i) => i % step === 0)
    .map((s) => ({ month: s.monthIndex, nominal: s.totalCapital }));

  const blob = await generateReportBlob(sampleInputs, result, {
    chartData,
    currentAge: 55,
    brandLionPngDataUrl,
    brandWordmarkPngDataUrl,
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
