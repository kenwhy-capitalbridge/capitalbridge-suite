/**
 * Writes docs/samples/forever-income-report.pdf (design review).
 * Run from repo root: npx tsx apps/forever/scripts/render-sample-pdf-for-docs.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLionVerdictClientReportFromForever, parseForeverRunway } from "@cb/advisory-graph/lionsVerdict";
import { ExpenseType } from "../legacy/types";
import { buildForeverStrategicWealthPdf } from "../legacy/foreverPdfBuild";
import { computeForeverResults } from "../legacy/foreverModel";
import { formatCurrency } from "../legacy/utils/formatters";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(scriptDir, "..", "..", "..");
const appPublic = join(scriptDir, "..", "public");

function main() {
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

  let logoDataUrl: string | null = null;
  try {
    const buf = readFileSync(join(appPublic, "capital-bridge-logo.png"));
    logoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    /* optional */
  }

  const doc = buildForeverStrategicWealthPdf({
    currency,
    ...inputs,
    results,
    foreverLionReport,
    includeLionsVerdict: true,
    logoDataUrl,
  });

  const outPath = join(repoRoot, "docs", "samples", "forever-income-report.pdf");
  mkdirSync(dirname(outPath), { recursive: true });
  const buf = Buffer.from(doc.output("arraybuffer"));
  writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main();
