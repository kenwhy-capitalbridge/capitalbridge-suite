/**
 * Capture a URL to PDF via Playwright (same stack as e2e: Chromium).
 * Always pass a real app URL (`page.goto`) — never inline HTML — so output matches hydration and fonts.
 *
 * Usage:
 *   npm run generate:pdf -- <url> [outputPath]
 *   PDF_URL=https://… PDF_OUTPUT=./out.pdf npm run generate:pdf
 *
 * Target pages should set window.__REPORT_READY__ = true when the report (incl. Lion) is stable.
 */

import { renderPdf } from "@cb/pdf/render";

const url = process.argv[2] ?? process.env.PDF_URL;
const outputPath = process.argv[3] ?? process.env.PDF_OUTPUT ?? "report.pdf";

if (!url || url === "--help" || url === "-h") {
  console.error("Usage: npm run generate:pdf -- <url> [outputPath]");
  console.error("Env: PDF_URL, PDF_OUTPUT");
  process.exit(1);
}

await renderPdf({ url, outputPath });
console.log(`Wrote ${outputPath}`);
