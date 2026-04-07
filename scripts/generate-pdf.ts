/**
 * Capture a URL to PDF via Playwright (same stack as e2e: Chromium).
 * Always pass a real app URL (`page.goto`) — never inline HTML — so output matches hydration and fonts.
 *
 * Usage:
 *   npm run generate:pdf -- <url> [outputPath]
 *   PDF_URL=https://… PDF_OUTPUT=./out.pdf npm run generate:pdf
 *
 * Forever v6 footer (STEP 3): set PDF_FOOTER=1 and optional PDF_FOOTER_REPORT_ID, PDF_FOOTER_VERSION
 * (loads footer wordmark from repo via @cb/pdf/forever-report-assets).
 *
 * Forever v6 report URL: `/dashboard/report-document/[exportId]` (legacy `/dashboard/print` redirects to `/dashboard`).
 * Requires an authenticated session (or use `apps/forever/scripts/render-mock-report-pdf.ts` for layout smoke tests).
 * STEP 6: that page inserts `public.report_exports` and sets `document.documentElement.dataset.cbForeverExportId`.
 * STEP 7: dashboard “Open print layout (PDF v6)” stores a session snapshot; print PATCHes `lion_config` via
 * `/api/forever/report-export/lion-config` (requires `report_exports_update_own` RLS policy).
 * STEP 8: print page renders inputs / outcomes / Lion from that snapshot; PATCH stores schema v2 (`calculator` +
 * `lion` nested objects) for re-download without sessionStorage.
 *
 * STEP 9: `PDF_FOOTER=dom` — footer Report ID + version read from the page (`data-cb-audit-report-id` on
 * `.cb-report-root`). Optional `PLAYWRIGHT_STORAGE_STATE=./path.json` for authenticated URLs.
 *
 * STEP 10: Forever print + dashboard jsPDF use `createReportAuditMeta({ foreverV6Export: { planSlug,
 * advisoryMarketId } })` — IANA zone from profile market (e.g. MY→Kuala Lumpur, SG→Singapore), filename date/time +
 * `generatedAtLabel`, optional `reportExportZoneLabel` (e.g. SG · GMT+8); `Trial_` + `Forever-Income-Model` when
 * plan is trial.
 *
 * STEP 11: Forever dashboard primary CTA is `/dashboard/print` only — client jsPDF removed from `legacy/App.tsx`;
 * `foreverPdfBuild.ts` remains for `render-sample-pdf-for-docs` only.
 *
 * Target pages should set window.__REPORT_READY__ = true when the report (incl. Lion) is stable.
 */

import { loadForeverReportLogoFooterDataUri } from "@cb/pdf/forever-report-assets";
import { renderPdf } from "@cb/pdf/render";

const url = process.argv[2] ?? process.env.PDF_URL;
const outputPath = process.argv[3] ?? process.env.PDF_OUTPUT ?? "report.pdf";

if (!url || url === "--help" || url === "-h") {
  console.error("Usage: npm run generate:pdf -- <url> [outputPath]");
  console.error("Env: PDF_URL, PDF_OUTPUT");
  console.error("Optional footer: PDF_FOOTER=1 PDF_FOOTER_REPORT_ID=… PDF_FOOTER_VERSION=…");
  console.error("Or: PDF_FOOTER=dom (footer IDs from page DOM) + optional PLAYWRIGHT_STORAGE_STATE=…");
  process.exit(1);
}

const footerMode = (process.env.PDF_FOOTER ?? "").trim().toLowerCase();
const useFooterStatic = footerMode === "1" || footerMode === "true";
const useFooterDom = footerMode === "dom" || footerMode === "from_dom";
const storageStatePath = process.env.PLAYWRIGHT_STORAGE_STATE?.trim();

await renderPdf({
  url,
  outputPath,
  storageStatePath: storageStatePath || undefined,
  playwrightFooterFromDom: useFooterDom,
  playwrightFooter: useFooterStatic
    ? {
        reportId: process.env.PDF_FOOTER_REPORT_ID?.trim() || "CB-DEV",
        versionLabel: process.env.PDF_FOOTER_VERSION?.trim() || "v0.0",
        logoDataUri: loadForeverReportLogoFooterDataUri(),
      }
    : undefined,
});
console.log(`Wrote ${outputPath}`);
