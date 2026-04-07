/**
 * Renders Capital Stress sample PDF via Playwright `page.goto` (real Next app + hydrated `PrintReport`).
 *
 * Prerequisite: `npm run dev -w @cb/capitalstress` (default http://127.0.0.1:3003).
 * From repo root: npx tsx apps/capitalstress/scripts/render-sample-pdf-for-docs.ts
 *
 * Override origin: SAMPLE_PDF_BASE_URL=http://127.0.0.1:3003
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPdf } from "@cb/pdf/render";
import { waitForHttpOk } from "../../../scripts/wait-for-http-get";

const DEFAULT_PORT = 3003;
const baseUrl = (process.env.SAMPLE_PDF_BASE_URL ?? `http://127.0.0.1:${DEFAULT_PORT}`).replace(/\/$/, "");
const reportUrl = `${baseUrl}/docs/sample-report`;

async function main() {
  const scriptDir = fileURLToPath(new URL(".", import.meta.url));
  const repoRoot = join(scriptDir, "..", "..", "..");
  const outPath = join(repoRoot, "docs", "samples", "capital-stress-report.pdf");
  mkdirSync(dirname(outPath), { recursive: true });

  await waitForHttpOk(reportUrl);
  await renderPdf({
    url: reportUrl,
    outputPath: outPath,
    waitForReportReadySignal: false,
    settleMsBeforePdf: 6000,
  });

  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
