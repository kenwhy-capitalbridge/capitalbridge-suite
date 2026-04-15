/**
 * Site-wide legal footer copy (single source of truth).
 */
export const CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY =
  "© Capital Bridge. All rights reserved. Capital Bridge™ and associated marks are proprietary. Any unauthorised use, reproduction, distribution, or derivation of this report or its contents is strictly prohibited. All content, outputs, and presentation derived from the proprietary multi-layer capital allocation engine are the intellectual property of Capital Bridge.";

/**
 * Playwright/Chromium PDF footer only (Forever v6 Option B).
 * Full IP paragraph appears on cover + appendix only — not in this band.
 */
export const CB_REPORT_PLAYWRIGHT_PDF_SHORT_FOOTER =
  "© Capital Bridge. All rights reserved. Unauthorised use or distribution of proprietary content and outputs is prohibited.";

/**
 * Chromium/Playwright PDF footer (left column) — same string on every exported report page.
 * Pagination is supplied by the footer template (`pageNumber` / `totalPages`), not in this text.
 * Report ID / version live in PDF document metadata (`renderPdf`), not in the visible header/footer.
 */
export const CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER =
  "© Capital Bridge. All rights reserved. Capital Bridge™ and associated marks are proprietary. Unauthorised use, reproduction, or distribution is prohibited.";
