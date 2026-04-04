"use client";

import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { CB_REPORT_LEGAL_NOTICE } from "@cb/shared/reportTraceability";

/**
 * Fixed print band: model name (left) + report ID / date / version (right), plus one legal footer.
 * Matches Forever Income v4 diagnostic + Capital Health react-pdf header rhythm.
 * Import `@cb/advisory-graph/reports/print.css` for `.cb-report-print-*` rules.
 */
export function ReportPrintChrome({ audit }: { audit: ReportAuditMeta }) {
  return (
    <>
      <div className="cb-report-print-header" aria-hidden>
        <div className="cb-report-print-header-inner">
          <div className="cb-report-print-header-model">{audit.modelDisplayName}</div>
          <div className="cb-report-print-header-meta">
            <div>Report ID: {audit.reportId}</div>
            <div>{audit.generatedAtLabel}</div>
            <div>Version: {audit.versionLabel}</div>
          </div>
        </div>
      </div>
      <div className="cb-report-print-footer">{CB_REPORT_LEGAL_NOTICE}</div>
    </>
  );
}
