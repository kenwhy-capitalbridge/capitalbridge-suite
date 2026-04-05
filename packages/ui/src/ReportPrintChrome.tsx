"use client";

import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { CB_REPORT_LEGAL_NOTICE } from "@cb/shared/reportTraceability";

/**
 * Fixed print band: model name (left) + report ID / date / version (right), plus one legal footer.
 * Matches Forever Income v4 diagnostic + Capital Health react-pdf header rhythm.
 * Import `@cb/advisory-graph/reports/print.css` for `.cb-report-print-*` rules.
 * Playwright PDF with `renderPdf({ playwrightFooter })` adds a class on `<html>` that hides
 * this in-page footer (Chromium supplies the short legal band instead).
 */
export function ReportPrintChrome({
  audit,
  /** Default: full site IP block. Forever v6 report PDF uses the short Playwright-aligned line. */
  printFooterText,
}: {
  audit: ReportAuditMeta;
  printFooterText?: string;
}) {
  const footer = printFooterText ?? CB_REPORT_LEGAL_NOTICE;
  return (
    <>
      <div className="cb-report-print-header" aria-hidden>
        <div className="cb-report-print-header-inner">
          <div className="cb-report-print-header-model">{audit.modelDisplayName}</div>
          <div className="cb-report-print-header-meta">
            <div>Report ID: {audit.reportId}</div>
            <div>{audit.generatedAtLabel}</div>
            {audit.reportExportZoneLabel ? <div>{audit.reportExportZoneLabel}</div> : null}
            <div>Version: {audit.versionLabel}</div>
          </div>
        </div>
      </div>
      <div className="cb-report-print-footer">{footer}</div>
    </>
  );
}
