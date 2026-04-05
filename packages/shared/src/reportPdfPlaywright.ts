/**
 * Playwright `page.pdf` with `displayHeaderFooter` + `footerTemplate` (Forever v6).
 * `renderPdf({ playwrightFooter })` adds this class to `<html>` before capture; print CSS
 * reserves bottom space and hides the in-page `.cb-report-print-footer` band.
 */
export const CB_REPORT_PDF_PLAYWRIGHT_FOOTER_HTML_CLASS =
  "cb-report-pdf-playwright-footer";

/**
 * STEP 9 — `renderPdf({ playwrightFooterFromDom: true })` reads these on `.cb-report-root` (or any matching node).
 */
export const CB_PDF_FOOTER_DOM_REPORT_ID_ATTR = "data-cb-audit-report-id";

export const CB_PDF_FOOTER_DOM_VERSION_ATTR = "data-cb-audit-version-label";
