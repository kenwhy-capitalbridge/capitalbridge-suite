"use client";

import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { CB_REPORT_LEGAL_NOTICE } from "@cb/shared/reportTraceability";

export type ReportPrintHeaderProps = {
  audit: ReportAuditMeta;
};

/**
 * Fixed print header band: model name (left) + report ID / date / version (right).
 * Compose with `ReportPrintFooter` or use `ReportPrintChrome` for both.
 */
export function ReportPrintHeader({ audit }: ReportPrintHeaderProps) {
  return (
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
  );
}

export type ReportPrintFooterProps = {
  /** Default: full site IP block. Forever v6 report PDF uses the short Playwright-aligned line. */
  printFooterText?: string;
};

/**
 * In-page legal line for print. Hidden when Playwright supplies the Chromium footer band.
 */
export function ReportPrintFooter({ printFooterText }: ReportPrintFooterProps) {
  const footer = printFooterText ?? CB_REPORT_LEGAL_NOTICE;
  return <div className="cb-report-print-footer">{footer}</div>;
}

export type ReportPrintChromeProps = {
  audit: ReportAuditMeta;
  printFooterText?: string;
};

/**
 * Fixed print band: model name (left) + report ID / date / version (right), plus one legal footer.
 * Matches Forever Income v4 diagnostic + Capital Health react-pdf header rhythm.
 * Import `@cb/advisory-graph/reports/print.css` for `.cb-report-print-*` rules.
 * Playwright PDF with `renderPdf({ playwrightFooter })` adds a class on `<html>` that hides
 * this in-page footer (Chromium supplies the short legal band instead).
 */
export function ReportPrintChrome({ audit, printFooterText }: ReportPrintChromeProps) {
  return (
    <>
      <ReportPrintHeader audit={audit} />
      <ReportPrintFooter printFooterText={printFooterText} />
    </>
  );
}
