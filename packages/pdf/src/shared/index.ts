/**
 * Shared Capital Bridge PDF layout system. Forever Income is the reference implementation;
 * Income Engineering, Capital Health, and Capital Stress must compose reports from these primitives
 * (not bespoke page shells).
 */

export type { PdfLayoutProps } from "./PdfLayout";
export { PdfLayout } from "./PdfLayout";

export type { PdfHeaderProps } from "./PdfHeader";
export { PdfHeader } from "./PdfHeader";

export type { PdfFooterProps } from "./PdfFooter";
export { PdfFooter } from "./PdfFooter";

export type { PdfSectionProps } from "./PdfSection";
export { PdfSection } from "./PdfSection";

export type { PdfChartBlockProps } from "./PdfChartBlock";
export { PdfChartBlock } from "./PdfChartBlock";

export type { PdfAdvisoryCoverPageProps, PdfTocBlock } from "./PdfAdvisoryCoverPage";
export { PdfAdvisoryCoverPage } from "./PdfAdvisoryCoverPage";

export {
  PDF_TOC_CAPITAL_HEALTH,
  PDF_TOC_CAPITAL_STRESS,
  PDF_TOC_FOREVER_INCOME,
  PDF_TOC_INCOME_ENGINEERING,
} from "./pdfAdvisoryCoverPresets";

export type { PdfAdvisorySectionLeadProps } from "./PdfAdvisorySectionLead";
export { PdfAdvisorySectionLead } from "./PdfAdvisorySectionLead";

export type { PdfLionsVerdictBlockProps, PdfLionsVerdictMicroSignal } from "./PdfLionsVerdictBlock";
export { mergeLionVerdictSummaryBody, PdfLionsVerdictBlock } from "./PdfLionsVerdictBlock";
