/**
 * Writes docs/samples/forever-income-report.pdf (design review).
 * Run from repo root: node node_modules/tsx/dist/cli.mjs apps/forever/scripts/render-sample-pdf-for-docs.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLionVerdictClientReportFromForever, parseForeverRunway } from "@cb/advisory-graph/lionsVerdict";
import { createReportAuditMeta } from "@cb/shared/reportTraceability";
import { stampAllPdfPagesWithAudit } from "@cb/ui";
import sharp from "sharp";
import { ExpenseType } from "../legacy/types";
import { buildForeverStrategicWealthPdf } from "../legacy/foreverPdfBuild";
import { computeForeverResults } from "../legacy/foreverModel";
import { formatCurrency } from "../legacy/utils/formatters";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(scriptDir, "..", "..", "..");
const uiAssets = join(repoRoot, "packages", "ui", "src", "assets");

/** Wordmark SVG viewBox is wider than 4:1; default sharp `resize` uses `cover` and crops the sides. */
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

async function main() {
  const currency = "RM";
  const inputs = {
    expenseType: ExpenseType.MONTHLY,
    expense: 10_000,
    familyContribution: 0,
    expectedReturn: 7,
    inflationRate: 2,
    cash: 20_000,
    investments: 250_000,
    realEstate: 500_000,
    propertyLoanCost: 3.55,
    propertyTimeHorizon: 20,
  };

  const results = computeForeverResults(inputs);
  const runwayInfo = parseForeverRunway(results.runway);
  const foreverLionInput = {
    isSustainable: results.isSustainable,
    progressPercent: results.progressPercent,
    gap: results.gap,
    currentAssets: results.currentAssets,
    capitalNeeded: Number.isFinite(results.capitalNeeded) ? results.capitalNeeded : 0,
    annualExpense: results.annualExpense,
    runwayLabel: results.runway,
    realReturnRate: results.realReturnRate,
    runwayYears: runwayInfo.perpetual ? null : runwayInfo.years,
    perpetualRunway: runwayInfo.perpetual,
    nominalExpectedReturnPct: inputs.expectedReturn,
  };
  const foreverLionReport = buildLionVerdictClientReportFromForever(foreverLionInput, {
    formatCurrency: (n) => formatCurrency(n, currency),
  });

  const [logoLionPngDataUrl, logoWordmarkPngDataUrl] = await Promise.all([
    svgFileToPngDataUrl(join(uiAssets, "lionhead_Green.svg"), 128, 128),
    svgFileToPngDataUrl(join(uiAssets, "CapitalBridgeLogo_Green.svg"), WORDMARK_RASTER_W, 90),
  ]);

  const doc = buildForeverStrategicWealthPdf({
    currency,
    ...inputs,
    results,
    foreverLionReport,
    includeLionsVerdict: true,
    logoLionPngDataUrl,
    logoWordmarkPngDataUrl,
    reportClientDisplayName: "Sample Client",
  });

  const audit = createReportAuditMeta({
    modelCode: "FOREVER",
    userDisplayName: "SampleClient",
    now: new Date("2026-03-28T12:00:00.000Z"),
  });
  stampAllPdfPagesWithAudit(doc, audit);

  const outPath = join(repoRoot, "docs", "samples", "forever-income-report.pdf");
  mkdirSync(dirname(outPath), { recursive: true });
  const buf = Buffer.from(doc.output("arraybuffer"));
  writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
