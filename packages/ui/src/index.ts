/**
 * Shared UI components for Capital Bridge apps.
 * Extend with buttons, cards, forms, etc. as needed.
 */
export { ModelAppHeader, type ModelAppHeaderProps } from "./ModelAppHeader";
export { HeaderBrandPicture, type HeaderBrandPictureProps } from "./HeaderBrandPicture";
export { CapitalBridgeLogoText, type CapitalBridgeLogoTextProps } from "./CapitalBridgeLogoText";
export {
  BRAND_CAPITAL_BRIDGE_LOGO_GOLD,
  BRAND_CAPITAL_BRIDGE_LOGO_GREEN,
  BRAND_FULL_CAPITAL_BRIDGE_GOLD,
  BRAND_FULL_CAPITAL_BRIDGE_GREEN,
  BRAND_LIONHEAD_GOLD,
  BRAND_LIONHEAD_GREEN,
  BRAND_LIONHEAD_GOLD_PNG_EXPORT,
} from "./brandPaths";
export { LionWatermarkBackdrop } from "./LionWatermarkBackdrop";
export { LionWatermarkShell } from "./LionWatermarkShell";
export {
  ModelMetricSpineProvider,
  useModelMetricSpine,
  type ModelMetricSpinePayload,
  type ModelMetricSpineSlot,
} from "./modelMetricSpineContext";
export {
  ModelReportDownloadFooter,
  MODEL_REPORT_DOWNLOAD_CTA_LABEL,
  type ModelReportDownloadFooterProps,
} from "./ModelReportDownloadFooter";
export { ChromeSpinnerGlyph, type ChromeSpinnerGlyphProps } from "./ChromeSpinnerGlyph";
export { ChromePendingNavLink } from "./ChromePendingNavLink";
export {
  ReportPrintChrome,
  ReportPrintFooter,
  ReportPrintHeader,
  type ReportPrintChromeProps,
  type ReportPrintFooterProps,
  type ReportPrintHeaderProps,
  type ReportPrintHeaderVisibility,
} from "./ReportPrintChrome";
export { stampAllPdfPagesWithAudit } from "./stampPdfAuditMeta";
export { CbLegalSiteFooter, type CbLegalSiteFooterProps } from "./CbLegalSiteFooter";
export { ElfsightChatbot } from "./ElfsightChatbot";
