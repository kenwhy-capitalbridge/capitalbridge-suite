/**
 * Regenerates all design-review PDFs under docs/samples/.
 * Run from repo root: npx tsx scripts/render-all-sample-pdfs.ts
 *
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const steps: { label: string; script: string }[] = [
  { label: "Capital Health", script: "apps/capitalhealth/scripts/render-sample-pdf-for-docs.ts" },
  { label: "Forever Income", script: "apps/forever/scripts/render-sample-pdf-for-docs.ts" },
  { label: "Capital Stress", script: "apps/capitalstress/scripts/render-sample-pdf-for-docs.ts" },
  { label: "Income Engineering", script: "apps/incomeengineering/scripts/render-sample-pdf-for-docs.ts" },
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
