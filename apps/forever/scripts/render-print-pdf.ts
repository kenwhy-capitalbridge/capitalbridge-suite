/**
 * Forever `/dashboard/print` → PDF via Playwright (STEP 9).
 *
 * Prereq: `npx playwright install chromium`, Forever dev server, valid session.
 *
 *   FOREVER_PRINT_URL=http://localhost:3006/dashboard/print \\
 *   PLAYWRIGHT_STORAGE_STATE=../../e2e/.auth/storage.json \\
 *   PDF_OUTPUT=./forever-print.pdf \\
 *   npm run render:print-pdf -w @cb/forever
 */

import { renderPdf } from "@cb/pdf/render";

const url = process.env.FOREVER_PRINT_URL?.trim() || process.argv[2];
const outputPath = process.env.PDF_OUTPUT?.trim() || process.argv[3] || "forever-print.pdf";
const storageStatePath = process.env.PLAYWRIGHT_STORAGE_STATE?.trim();

if (!url) {
  console.error("Set FOREVER_PRINT_URL or pass the print page URL as the first argument.");
  process.exit(1);
}

await renderPdf({
  url,
  outputPath,
  storageStatePath: storageStatePath || undefined,
  playwrightFooterFromDom: true,
});

console.log(`Wrote ${outputPath}`);
