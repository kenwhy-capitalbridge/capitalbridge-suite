/**
 * Renders Income Engineering sample PDF via Playwright `page.goto` (real Next app + hydration).
 *
 * Prerequisite: `npm run dev -w @cb/incomeengineering` (default http://127.0.0.1:3005).
 * From repo root: npx tsx apps/incomeengineering/scripts/render-sample-pdf-for-docs.ts
 *
 * Override origin: SAMPLE_PDF_BASE_URL=http://127.0.0.1:3005
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPdf } from "@cb/pdf/render";
import { waitForHttpOk } from "../../../scripts/wait-for-http-get";

const DEFAULT_PORT = 3005;
const baseUrl = (process.env.SAMPLE_PDF_BASE_URL ?? `http://127.0.0.1:${DEFAULT_PORT}`).replace(/\/$/, "");
const reportUrl = `${baseUrl}/docs/sample-report`;

async function main() {
  const scriptDir = fileURLToPath(new URL(".", import.meta.url));
  const repoRoot = join(scriptDir, "..", "..", "..");
  const outPath = join(repoRoot, "docs", "samples", "income-engineering-report.pdf");
  mkdirSync(dirname(outPath), { recursive: true });

  await waitForHttpOk(reportUrl);
  await renderPdf({ url: reportUrl, outputPath: outPath });

  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
