/**
 * Chromium/Playwright `page.pdf` footer template (Forever v6 STEP 3).
 * Uses built-in classes: pageNumber, totalPages.
 *
 * STEP 4: `renderPdf` adds `CB_REPORT_PDF_PLAYWRIGHT_FOOTER_HTML_CLASS` on `<html>`;
 * `@cb/advisory-graph/reports/print.css` reserves the same band via
 * `--cb-playwright-pdf-footer-reserved` (keep in sync with PLAYWRIGHT_PDF_FOOTER_RESERVED_MM).
 *
 * STEP 9: `renderPdf({ playwrightFooterFromDom: true })` reads `CB_PDF_FOOTER_DOM_*` on `.cb-report-root`.
 */

import { CB_REPORT_PLAYWRIGHT_PDF_SHORT_FOOTER } from "@cb/shared/legalMonocopy";

export type PlaywrightPdfFooterContext = {
  /** e.g. CB-FOREVER-… */
  reportId: string;
  /** e.g. v1.2 */
  versionLabel: string;
  /** From `loadForeverReportLogoFooterDataUri()` */
  logoDataUri: string;
};

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Top / bottom margin when Playwright footer is active — keep in sync with `renderPdf` margin and
 * `@page` in `advisoryReportPdfTemplate.css` (fixed header height 18mm, footer band 12mm).
 */
export const PLAYWRIGHT_PDF_HEADER_RESERVED_MM = 18;
export const PLAYWRIGHT_PDF_FOOTER_RESERVED_MM = 12;

/**
 * Single-line footer: small wordmark + short legal (left) · report meta + page x/y (right).
 */
export function buildPlaywrightPdfFooterTemplate(ctx: PlaywrightPdfFooterContext): string {
  const legal = escapeHtmlText(CB_REPORT_PLAYWRIGHT_PDF_SHORT_FOOTER);
  const rid = escapeHtmlText(ctx.reportId);
  const ver = escapeHtmlText(ctx.versionLabel);
  const logo = ctx.logoDataUri;

  return `<div style="box-sizing:border-box;width:100%;min-height:12mm;height:12mm;max-height:12mm;padding:2px 20px;overflow:hidden;font-size:7.5px;line-height:1.3;color:#2B2B2B;font-family:Inter,Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:space-between;gap:10px;">
  <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
    <img src="${logo}" alt="" style="height:16px;width:auto;max-width:100px;object-fit:contain;object-position:left center;flex-shrink:0;display:block;" />
    <span style="flex:1;min-width:0;">${legal}</span>
  </div>
  <div style="flex-shrink:0;text-align:right;white-space:nowrap;font-size:7px;">
    ${rid} · ${ver} · Page <span class="pageNumber"></span> / <span class="totalPages"></span>
  </div>
</div>`;
}

/** Minimal header so Chromium does not reserve a large blank band. */
export const PLAYWRIGHT_PDF_EMPTY_HEADER_TEMPLATE =
  '<div style="height:0;margin:0;padding:0;font-size:0;"></div>';
