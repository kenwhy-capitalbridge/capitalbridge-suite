/**
 * Renders Income Engineering PrintReportView to docs/samples/income-engineering-report.pdf via Playwright.
 * Requires: npm i at repo root (Puppeteer bundles Chromium).
 * Run from repo root: npx tsx apps/incomeengineering/scripts/render-sample-pdf-for-docs.ts
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import puppeteer from "puppeteer";
import { getDefaultInvestmentBuckets } from "../legacy/config/investmentCategories";
import type { CurrencyCode } from "../legacy/config/currency";
import { PrintReportView } from "../legacy/components/PrintReportView";
import { runSimulation } from "../legacy/lib/simulation";
import type { IncomeRow } from "../legacy/types/calculator";

const PRINT_CSS = `
  @page { size: A4; margin: 16mm; }
  body { margin: 0; background: #fff; }
  .print-report [data-pdf-part] {
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  .print-report section {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

async function main() {
  const currency: CurrencyCode = "RM";
  const monthlyExpenses = 8_000;
  const incomeRows: IncomeRow[] = [
    { id: "inc-1", label: "Salary / Wages", amount: 12_000 },
    { id: "inc-2", label: "Rental Income", amount: 0 },
    { id: "inc-3", label: "Family Contribution", amount: 0 },
    { id: "inc-4", label: "Other Recurring Income", amount: 0 },
  ];
  const allocations = [200_000, 150_000, 180_000, 250_000, 50_000];
  const investmentBuckets = getDefaultInvestmentBuckets().map((b, i) => ({
    ...b,
    allocation: allocations[i] ?? 0,
  }));

  const result = runSimulation({
    currency,
    monthlyExpenses,
    incomeRows,
    loans: [],
    investmentBuckets,
    assetUnlocks: [],
  });

  const totalCapital =
    (result.summary.totalUnlockedLiquidity ?? 0) +
    investmentBuckets.reduce((s, b) => s + (b.allocation ?? 0), 0);

  const markup = renderToStaticMarkup(
    React.createElement(PrintReportView, {
      summary: result.summary,
      currency,
      totalCapital,
      monthlyExpenses,
      incomeRows,
      loans: [],
      assetUnlocks: [],
      investmentBuckets,
      medianCoverage: result.medianCoverage,
      worstMonthCoverage: result.worstMonthCoverage,
      lionAccessEnabled: true,
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
  const outPath = join(repoRoot, "docs", "samples", "income-engineering-report.pdf");
  mkdirSync(dirname(outPath), { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMediaType("print");
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
