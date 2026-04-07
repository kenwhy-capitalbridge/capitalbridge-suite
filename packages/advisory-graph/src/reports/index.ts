/**
 * Shared advisory report layout system.
 * Use the same primitives and `STANDARD_REPORT_SECTION_IDS` for all four model reports.
 * (No report copy lives here — only structure, tokens, and print hooks.)
 *
 * Next.js / Playwright PDF reports should compose `@cb/pdf/shared` (`PdfLayout`, `PdfSection`, `PdfChartBlock`)
 * rather than mounting `AdvisoryReportPdfDocumentRoot` directly — Forever Income is the reference app.
 */

export type {
  AdvisoryReportKind,
  ReportTier,
  StandardReportSectionId,
} from './reportCatalog';
export {
  ADVISORY_REPORT_KINDS,
  STANDARD_REPORT_SECTION_IDS,
} from './reportCatalog';

export {
  CB_REPORT_CHART_WRAP,
  CB_REPORT_DISCLOSURE,
  CB_REPORT_KEEP_WITH_NEXT,
  CB_REPORT_PAGE_BREAK,
  CB_REPORT_PDF_PLAYWRIGHT_FOOTER_HTML_CLASS,
  CB_REPORT_ROOT,
  CB_REPORT_SECTION,
  CB_REPORT_TABLE_HEAD,
  CB_REPORT_TIER_FULL,
  CB_REPORT_TIER_TRIAL,
} from './classes';

export {
  REPORT_ACCENT,
  REPORT_BG,
  REPORT_BORDER,
  REPORT_BRAND_GREEN,
  REPORT_BRAND_TAGLINE,
  REPORT_FONT_BODY,
  REPORT_FONT_DISPLAY,
  REPORT_MUTED,
  REPORT_TEXT,
  REPORT_TYPE,
} from './tokens';

export {
  getCapitalBridgeReportFullGreenSrc,
  getCapitalBridgeReportLionGreenSrc,
  getCapitalBridgeReportLogoSrc,
  getCapitalBridgeReportWordmarkGreenSrc,
} from './lionReportLogo';
export type { ReportBrandMarkProps } from './ReportBrandMark';
export { ReportBrandMark } from './ReportBrandMark';
export type { ReportInteriorHeaderProps } from './ReportInteriorHeader';
export { ReportInteriorHeader } from './ReportInteriorHeader';

export type { AdvisoryReportPdfDocumentRootProps } from './AdvisoryReportPdfDocumentRoot';
export { AdvisoryReportPdfDocumentRoot } from './AdvisoryReportPdfDocumentRoot';
export type { ReportDocumentProps } from './ReportDocument';
export { ReportDocument } from './ReportDocument';
export type { ReportSectionProps } from './ReportSection';
export { ReportSection } from './ReportSection';
export type { ReportCoverProps } from './ReportCover';
export { ReportCover } from './ReportCover';
export type { ReportHeadingProps } from './ReportHeading';
export { ReportHeading } from './ReportHeading';
export type { ReportProseProps } from './ReportProse';
export { ReportProse } from './ReportProse';
export { ReportTrialSnapshotCaption } from './ReportTrialSnapshotCaption';
export type { ReportBulletListProps } from './ReportBulletList';
export { ReportBulletList } from './ReportBulletList';
export type { ReportCalloutProps } from './ReportCallout';
export { ReportCallout } from './ReportCallout';
export type { ReportKpiCardProps, ReportKpiGridProps } from './ReportKpiGrid';
export { ReportKpiCard, ReportKpiGrid } from './ReportKpiGrid';
export type { ReportKeyValueGridProps, ReportKeyValueRow } from './ReportKeyValueGrid';
export { ReportKeyValueGrid } from './ReportKeyValueGrid';
export type { ReportTableHeadProps, ReportTableShellProps } from './ReportTableShell';
export { ReportTableHead, ReportTableShell } from './ReportTableShell';
export type { ReportDisclosureProps } from './ReportDisclosure';
export { ReportDisclosure } from './ReportDisclosure';
export type { ReportChartSlotProps } from './ReportChartSlot';
export { ReportChartSlot } from './ReportChartSlot';

export {
  buildCapitalTimelinePrintPayload,
  capitalTrajectoryFromYValues,
  CAPITAL_TIMELINE_SCOPE_NOTE,
  formatCapitalTrajectoryLabel,
  latestChangePlainEnglish,
} from './capitalTimeline';
export type {
  CapitalTimelinePoint,
  CapitalTimelinePrintPayload,
  CapitalTimelineTrajectory,
} from './capitalTimeline';
export {
  CapitalTimelinePrintSection,
} from './CapitalTimelinePrintSection';
export type { CapitalTimelinePrintSectionProps } from './CapitalTimelinePrintSection';
export {
  extractStressDisplayScoreFromSavedResults,
  extractStressResilienceTechnicalFromResults,
} from './stressSavedReportMetric';
