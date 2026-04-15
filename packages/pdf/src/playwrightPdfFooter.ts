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

import { CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER } from "@cb/shared/legalMonocopy";

export type PlaywrightPdfFooterContext = {
  /** e.g. CB-FOREVER-… — kept for API compatibility; Chromium footer shows copyright + pages only. */
  reportId: string;
  /** e.g. v1.2 */
  versionLabel: string;
  /** Green wordmark (`CapitalBridgeLogo_Green.svg`) as data URI for the footer template `<img>`. */
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
export const PLAYWRIGHT_PDF_FOOTER_TEMPLATE_MIN_MM = 24;
/** Canonical copyright + pagination; keep page bottom margin ≥ this (logo + 2-line legal). */
export const PLAYWRIGHT_PDF_FOOTER_RESERVED_MM = 26;

/**
 * Green wordmark (left) · centred legal · pagination (right).
 * Report id / version are PDF metadata only, not in this band.
 */
export function buildPlaywrightPdfFooterTemplate(ctx?: PlaywrightPdfFooterContext): string {
  const legal = escapeHtmlText(CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER);
  const logo = ctx?.logoDataUri?.trim() ?? "";
  const logoBlock =
    logo.length > 0
      ? `<img src="${escapeHtmlText(logo)}" alt="" style="display:block;height:6mm;width:auto;max-width:42mm;object-fit:contain;object-position:left bottom;" />`
      : `<span style="display:inline-block;width:1px;height:6mm;"></span>`;

  return `<div style="box-sizing:border-box;width:100%;min-height:${PLAYWRIGHT_PDF_FOOTER_TEMPLATE_MIN_MM}mm;padding:3px 13mm 2px;display:flex;align-items:flex-end;justify-content:space-between;gap:8px;font-size:7.5pt;line-height:1.35;color:#2B2B2B;font-family:Inter,Arial,Helvetica,sans-serif;">
  <div style="flex:0 0 auto;min-width:0;max-width:32%;align-self:flex-end;">${logoBlock}</div>
  <div style="flex:1;min-width:0;text-align:center;white-space:normal;padding:0 6px;">${legal}</div>
  <div style="flex:0 0 auto;text-align:right;white-space:nowrap;font-size:8pt;line-height:1.35;color:#374151;align-self:flex-end;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>
</div>`;
}

/** Minimal header so Chromium does not reserve a large blank band. */
export const PLAYWRIGHT_PDF_EMPTY_HEADER_TEMPLATE =
  '<div style="height:0;margin:0;padding:0;font-size:0;"></div>';
