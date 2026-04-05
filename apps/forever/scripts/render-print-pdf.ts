/**
 * Forever report document → PDF via Playwright (authenticated session).
 *
 * Prereq: `npx playwright install chromium`, Forever dev server, valid session, existing `exportId`.
 *
 *   FOREVER_PRINT_URL=http://localhost:3006/dashboard/report-document/<exportId> \\
 *   PLAYWRIGHT_STORAGE_STATE=../../e2e/.auth/storage.json \\
 *   PDF_OUTPUT=./forever-print.pdf \\
 *   npm run render:print-pdf -w @cb/forever
 */

import { renderPdf } from "@cb/pdf/render";

const url = process.env.FOREVER_PRINT_URL?.trim() || process.argv[2];
const outputPath = process.env.PDF_OUTPUT?.trim() || process.argv[3] || "forever-print.pdf";
const storageStatePath = process.env.PLAYWRIGHT_STORAGE_STATE?.trim();

if (!url) {
  console.error("Set FOREVER_PRINT_URL or pass the report-document URL (with exportId) as the first argument.");
  process.exit(1);
}

await renderPdf({
  url,
  outputPath,
  storageStatePath: storageStatePath || undefined,
  playwrightFooterFromDom: true,
});

console.log(`Wrote ${outputPath}`);
