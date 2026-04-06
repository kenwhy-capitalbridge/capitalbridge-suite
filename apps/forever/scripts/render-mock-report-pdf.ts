/**
 * Capture the Forever strategic report (mock data) to a PDF — no Supabase, no Vercel.
 *
 * Prereqs:
 *   npx playwright install chromium
 *   Forever dev server: npm run dev -w @cb/forever   (default http://localhost:3006)
 *
 * Usage (from repo root):
 *   npm run render:mock-pdf -w @cb/forever
 *
 * Optional env:
 *   FOREVER_DEV_URL=http://localhost:3006
 *   PDF_OUTPUT=./tmp/forever-mock.pdf   (relative paths are resolved from the monorepo root, not apps/forever)
 *   CB_FOREVER_ALLOW_MOCK_REPORT=1   (only if you use `next start` instead of `next dev`)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { renderPdf } from "@cb/pdf/render";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const base = (process.env.FOREVER_DEV_URL ?? "http://localhost:3006").replace(/\/+$/, "");
const url = `${base}/docs/forever-report-mock`;
const rawOutput = process.env.PDF_OUTPUT?.trim() || "tmp/forever-mock.pdf";
const outputPath = path.isAbsolute(rawOutput) ? rawOutput : path.resolve(monorepoRoot, rawOutput);

void (async () => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await renderPdf({
    url,
    outputPath,
    playwrightFooterFromDom: true,
  });
  console.log(`Wrote ${outputPath} (source ${url})`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
