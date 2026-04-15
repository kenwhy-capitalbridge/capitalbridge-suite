/**
 * Authenticated smoke: Income Engineering Playwright PDF pipeline (same stack as
 * `/api/income-engineering/report-pdf/[exportId]` + `renderPdf`).
 *
 * ## What it does
 * 1. Waits until the app origin responds over HTTP (dev server up).
 * 2. POSTs a minimal `IncomePrintSnapshotV1` to `/api/income-engineering/report-export/start`
 *    using a Playwright browser context with your saved `storageState` (logged-in session).
 * 3. Calls `renderPdf` on `/dashboard/income-report-document/[exportId]` with the same
 *    `storageStatePath` + `playwrightFooterFromDom: true` (Chromium footer + DOM header).
 * 4. Asserts the output file starts with `%PDF` and is not trivially small.
 *
 * ## Pass / fail
 * - **Pass**: process exits 0 and prints `OK: … (N bytes)` with N ≥ 200.
 * - **Fail**: process exits 1 — missing env, HTTP errors (401/403/500), `renderPdf` throws,
 *   or output is missing/too small/invalid PDF magic.
 *
 * ## How to run locally
 *
 * 1. **Playwright Chromium** (once): `npm run docs:playwright-browsers` or `npx playwright install chromium`
 *
 * 2. **Storage state** must include a valid Supabase session **for the Income Engineering origin**
 *    you will use (cookies for `127.0.0.1:3005` are not the same as login-only cookies).
 *    - Easiest: log in at `http://127.0.0.1:3005/dashboard` in a normal browser, then use a small
 *      Playwright snippet to `context.storageState({ path: 'e2e/.auth/ie-storage.json' })` after that
 *      navigation; or reuse any `storage.json` that was saved **after** visiting the IE app on that host.
 *
 * 3. **Start the app** (separate terminal): `npm run dev -w @cb/incomeengineering`
 *    (default http://127.0.0.1:3005 — must match `CB_IE_PDF_SMOKE_ORIGIN`).
 *
 * 4. **Run smoke** from repo root:
 *    ```bash
 *    PLAYWRIGHT_STORAGE_STATE=e2e/.auth/ie-storage.json \
 *      CB_IE_PDF_SMOKE_ORIGIN=http://127.0.0.1:3005 \
 *      npm run ci:income-engineering-pdf-smoke
 *    ```
 *
 * Optional: skip POST and reuse an export row (same user as storage):
 *   `CB_IE_PDF_SMOKE_EXPORT_ID=<uuid>` — only exercises `renderPdf` + document route.
 *
 * Aligned with: `scripts/generate-pdf.ts` (`PLAYWRIGHT_STORAGE_STATE` + real app URL) and
 * Capital Stress’s `report-export/start` → `report-pdf` client flow.
 */

import { existsSync, mkdtempSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { renderPdf } from "@cb/pdf/render";
import type { IncomePrintSnapshotV1 } from "../../apps/incomeengineering/legacy/incomePrintSnapshot";
import { waitForHttpOk } from "../wait-for-http-get";

const DEFAULT_ORIGIN = "http://127.0.0.1:3005";

/** Minimal snapshot that passes `isIncomePrintSnapshotV1` and renders a short report. */
const MOCK_INCOME_SNAPSHOT: IncomePrintSnapshotV1 = {
  v: 1,
  summary: {
    monthlyIncome: 10_000,
    monthlyExpenses: 8_000,
    monthlyLoanRepayments: 0,
    estimatedMonthlyInvestmentIncome: 0,
    netMonthlySurplusShortfall: 2_000,
    sustainabilityStatus: "green",
  },
  currency: "RM",
  totalCapital: 500_000,
  monthlyExpenses: 8_000,
  incomeRows: [{ id: "smoke-1", label: "Smoke income", amount: 10_000 }],
  loans: [],
  assetUnlocks: [],
  investmentBuckets: [],
  medianCoverage: 1.1,
  worstMonthCoverage: 1.0,
  lionAccessEnabled: true,
  reportClientDisplayName: "PDF smoke",
  hasStrategicInterest: false,
};

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

/** Reject obvious mistakes (/dev/null, empty) before long waits. */
function assertPlaywrightStorageFile(path: string): void {
  if (!existsSync(path)) {
    die(`PLAYWRIGHT_STORAGE_STATE file not found: ${path}`);
  }
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    die(`Cannot read PLAYWRIGHT_STORAGE_STATE: ${path}`);
  }
  if (!raw.trim()) {
    die(`PLAYWRIGHT_STORAGE_STATE is empty: ${path}`);
  }
  try {
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object" || Array.isArray(j)) {
      die(`PLAYWRIGHT_STORAGE_STATE must be a JSON object: ${path}`);
    }
    const o = j as Record<string, unknown>;
    const hasCookies = Array.isArray(o.cookies);
    const hasOrigins = Array.isArray(o.origins);
    if (!hasCookies && !hasOrigins) {
      die(
        `PLAYWRIGHT_STORAGE_STATE does not look like Playwright storage (expected "cookies" and/or "origins"): ${path}`,
      );
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      die(`PLAYWRIGHT_STORAGE_STATE is not valid JSON: ${path}`);
    }
    throw e;
  }
}

void (async () => {
  const origin = (process.env.CB_IE_PDF_SMOKE_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/+$/, "");
  const storagePath = process.env.PLAYWRIGHT_STORAGE_STATE?.trim();
  const exportIdOverride = process.env.CB_IE_PDF_SMOKE_EXPORT_ID?.trim();

  if (!storagePath) {
    die(
      "Missing PLAYWRIGHT_STORAGE_STATE (path to Playwright storage.json).\n" +
        "Example: PLAYWRIGHT_STORAGE_STATE=e2e/.auth/ie-storage.json\n" +
        "The file must include session cookies for the same origin as CB_IE_PDF_SMOKE_ORIGIN " +
        "(log in at that origin’s /dashboard, then save storage state).",
    );
  }
  assertPlaywrightStorageFile(storagePath);

  await waitForHttpOk(origin, { timeoutMs: 120_000, intervalMs: 500 }).catch((e) => {
    die(
      `App not reachable at ${origin}: ${e instanceof Error ? e.message : String(e)}\n` +
        "Start the dev server: npm run dev -w @cb/incomeengineering",
    );
  });

  let exportId = exportIdOverride ?? "";

  if (!exportId) {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ storageState: storagePath });
      const res = await context.request.post(`${origin}/api/income-engineering/report-export/start`, {
        data: { snapshot: MOCK_INCOME_SNAPSHOT },
        headers: { "Content-Type": "application/json" },
      });
      const text = await res.text();
      if (!res.ok()) {
        die(
          `report-export/start failed: HTTP ${res.status()}\n${text}\n` +
            "If 401: storage state likely lacks cookies for this origin — save storage after visiting " +
            `${origin}/dashboard while logged in.`,
        );
      }
      let body: { exportId?: string };
      try {
        body = JSON.parse(text) as { exportId?: string };
      } catch {
        die(`report-export/start: invalid JSON: ${text.slice(0, 500)}`);
      }
      if (!body.exportId) {
        die(`report-export/start: missing exportId in response: ${text}`);
      }
      exportId = body.exportId;
      console.error(`[income-engineering-pdf-smoke] exportId=${exportId}`);
    } finally {
      await browser.close();
    }
  } else {
    console.error(`[income-engineering-pdf-smoke] using CB_IE_PDF_SMOKE_EXPORT_ID=${exportId}`);
  }

  const docUrl = `${origin}/dashboard/income-report-document/${exportId}`;
  const outDir = mkdtempSync(join(tmpdir(), "cb-ie-pdf-smoke-"));
  const outputPath = join(outDir, "smoke.pdf");

  try {
    await renderPdf({
      url: docUrl,
      outputPath,
      playwrightFooterFromDom: true,
      storageStatePath: storagePath,
      timeoutMs: 120_000,
    });
  } catch (e) {
    die(`renderPdf failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const buf = readFileSync(outputPath);
  if (buf.length < 200) {
    die(`PDF output unexpectedly small: ${buf.length} bytes`);
  }
  if (buf.subarray(0, 4).toString() !== "%PDF") {
    die("Output is not a PDF (missing %PDF header)");
  }

  console.log(`OK: ${outputPath} (${buf.length} bytes)`);
  try {
    unlinkSync(outputPath);
  } catch {
    /* ignore */
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
