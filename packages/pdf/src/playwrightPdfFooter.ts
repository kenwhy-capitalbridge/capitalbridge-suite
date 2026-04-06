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
 * Playwright PDF margins are the single physical inset (CSS `@page` for advisory doc uses 0).
 * Fixed header/footer bands in HTML + footer template align to these values.
 */
export const PLAYWRIGHT_PDF_HEADER_RESERVED_MM = 20;
/** Matches `--cb-header-height` / fixed `.cb-report-print-header` band inside the content viewport. */
export const PLAYWRIGHT_PDF_FIXED_PRINT_HEADER_BAND_MM = 18;
/** Chromium footer template min band; Playwright bottom margin should be ≥ this for readable text. */
export const PLAYWRIGHT_PDF_FOOTER_TEMPLATE_MIN_MM = 16;
export const PLAYWRIGHT_PDF_FOOTER_RESERVED_MM = 20;

/**
 * Single-line footer: small wordmark + short legal (left) · report meta + page x/y (right).
 */
export function buildPlaywrightPdfFooterTemplate(ctx: PlaywrightPdfFooterContext): string {
  const legal = escapeHtmlText(CB_REPORT_PLAYWRIGHT_PDF_SHORT_FOOTER);
  const rid = escapeHtmlText(ctx.reportId);
  const ver = escapeHtmlText(ctx.versionLabel);
  const logo = ctx.logoDataUri;

  return `<div style="box-sizing:border-box;width:100%;min-height:${PLAYWRIGHT_PDF_FOOTER_TEMPLATE_MIN_MM}mm;padding:2px 13mm;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;font-size:9px;line-height:1.4;color:#2B2B2B;font-family:Inter,Arial,Helvetica,sans-serif;">
  <div style="display:flex;align-items:flex-start;gap:8px;min-width:0;flex:1;">
    <img src="${logo}" alt="" style="height:16px;width:auto;max-width:100px;object-fit:contain;object-position:left top;flex-shrink:0;display:block;margin-top:1px;" />
    <span style="flex:1;min-width:0;white-space:normal;">${legal}</span>
  </div>
  <div style="flex-shrink:0;text-align:right;white-space:nowrap;font-size:8px;line-height:1.35;margin-top:1px;">
    ${rid} · ${ver} · Page <span class="pageNumber"></span> / <span class="totalPages"></span>
  </div>
</div>`;
}

/** Minimal header so Chromium does not reserve a large blank band. */
export const PLAYWRIGHT_PDF_EMPTY_HEADER_TEMPLATE =
  '<div style="height:0;margin:0;padding:0;font-size:0;"></div>';
