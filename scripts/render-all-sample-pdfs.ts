/**
 * Regenerates design-review PDFs under docs/samples/ via real app URLs + Playwright `page.goto`.
 *
 * Income Engineering + Capital Stress require dev servers (IE: `/docs/ie-sample-print`, Stress: `/docs/sample-report`):
 *   npm run dev -w @cb/incomeengineering
 *   npm run dev -w @cb/capitalstress
 *
 * Run from repo root: npx tsx scripts/render-all-sample-pdfs.ts
 * Browsers: npx playwright install chromium
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Pilot-first (STEP A): Playwright URL samples before programmatic PDF apps. */
const steps: { label: string; script: string }[] = [
  { label: "Income Engineering (Playwright URL)", script: "apps/incomeengineering/scripts/render-sample-pdf-for-docs.ts" },
  { label: "Capital Stress (Playwright URL)", script: "apps/capitalstress/scripts/render-sample-pdf-for-docs.ts" },
  { label: "Capital Health (jsPDF)", script: "apps/capitalhealth/scripts/render-sample-pdf-for-docs.ts" },
  { label: "Forever Income (jsPDF)", script: "apps/forever/scripts/render-sample-pdf-for-docs.ts" },
];

for (const { label, script } of steps) {
  console.log(`— ${label}…`);
  const r = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", script], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`Failed: ${label} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

console.log("All sample PDFs updated under docs/samples/.");
