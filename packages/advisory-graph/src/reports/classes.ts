/**
 * Class names for print layout. Apps should import `reports/print.css` and/or mirror
 * existing `.print-*` rules until all models use the shared stylesheet.
 */

export { CB_REPORT_PDF_PLAYWRIGHT_FOOTER_HTML_CLASS } from "@cb/shared/reportPdfPlaywright";

/** Root wrapper — hide on screen in apps that mount report off-DOM; show @ media print */
export const CB_REPORT_ROOT = 'cb-report-root';

/** Section block — avoid awkward splits; pair with page break variant when needed */
export const CB_REPORT_SECTION = 'cb-report-section';

/** Modifier: add next to `CB_REPORT_SECTION` for a new printed page */
export const CB_REPORT_PAGE_BREAK = 'cb-report-section--page-break';

/** Table: repeat header row each printed page */
export const CB_REPORT_TABLE_HEAD = 'cb-report-table-head';

/** Keep element with following block */
export const CB_REPORT_KEEP_WITH_NEXT = 'cb-report-keep-with-next';

/** Chart / figure wrapper */
export const CB_REPORT_CHART_WRAP = 'cb-report-chart-wrap';

/** Last-page disclosure area */
export const CB_REPORT_DISCLOSURE = 'cb-report-disclosure';

/** Trial tier chrome (hook for banner / watermark via CSS) */
export const CB_REPORT_TIER_TRIAL = 'cb-report-tier--trial';

/** Full (paid) tier */
export const CB_REPORT_TIER_FULL = 'cb-report-tier--full';
