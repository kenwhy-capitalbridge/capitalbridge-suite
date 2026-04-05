"use client";

import type { ReactNode } from "react";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import {
  CB_PDF_FOOTER_DOM_REPORT_ID_ATTR,
  CB_PDF_FOOTER_DOM_VERSION_ATTR,
} from "@cb/shared/reportPdfPlaywright";
import { ReportPrintChrome } from "@cb/ui";

export type AdvisoryReportPdfDocumentRootProps = {
  audit: ReportAuditMeta;
  shortFooterLegal: string;
  children: ReactNode;
  /** Optional model-specific surface class for accents (e.g. `cb-forever-doc-report`). */
  modelSurfaceClass?: string;
  className?: string;
};

/**
 * Standard Playwright PDF document shell: fixed print header/footer band, DOM attrs for Chromium footer,
 * and `data-cb-advisory-report-document` for shared print CSS (watermarks, @page, section breaks).
 */
export function AdvisoryReportPdfDocumentRoot({
  audit,
  shortFooterLegal,
  children,
  modelSurfaceClass,
  className = "",
}: AdvisoryReportPdfDocumentRootProps) {
  return (
    <div
      className={[
        "cb-report-root",
        "cb-advisory-pdf-doc",
        "print-report-root",
        "min-h-screen",
        "text-[#0d3a1d]",
        modelSurfaceClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-cb-advisory-report-document=""
      {...{
        [CB_PDF_FOOTER_DOM_REPORT_ID_ATTR]: audit.reportId,
        [CB_PDF_FOOTER_DOM_VERSION_ATTR]: audit.versionLabel,
      }}
    >
      <ReportPrintChrome audit={audit} printFooterText={shortFooterLegal} />
      {children}
    </div>
  );
}
