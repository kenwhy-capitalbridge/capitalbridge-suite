"use client";

import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { CB_REPORT_LEGAL_NOTICE } from "@cb/shared/reportTraceability";

/**
 * Fixed print header (top right) + legal footer on every sheet.
 * Import `@cb/advisory-graph/reports/print.css` (or equivalent) for `.cb-report-print-*` rules.
 */
export function ReportPrintChrome({ audit }: { audit: ReportAuditMeta }) {
  return (
    <>
      <div className="cb-report-print-header" aria-hidden>
        <div className="cb-report-print-header-inner">
          <div>Report ID: {audit.reportId}</div>
          <div>{audit.generatedAtLabel}</div>
          <div>Version: {audit.versionLabel}</div>
          <div>{audit.modelDisplayName}</div>
        </div>
      </div>
      <div className="cb-report-print-footer">{CB_REPORT_LEGAL_NOTICE}</div>
    </>
  );
}
