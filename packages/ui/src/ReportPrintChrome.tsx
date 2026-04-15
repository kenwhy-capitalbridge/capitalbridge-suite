"use client";

import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER } from "@cb/shared/legalMonocopy";

/** Defaults: model name visible; report id / version only in PDF metadata (not in DOM). */
export type ReportPrintHeaderVisibility = {
  showModelName?: boolean;
  showReportId?: boolean;
  showVersion?: boolean;
};

export type ReportPrintHeaderProps = {
  audit: ReportAuditMeta;
  /** Override which header lines render (screen + print DOM). Report ID remains on `.cb-report-root` data attrs for metadata. */
  visibility?: ReportPrintHeaderVisibility;
};

const headerDefaults: Required<ReportPrintHeaderVisibility> = {
  showModelName: true,
  showReportId: false,
  showVersion: false,
};

/**
 * Fixed print header band: model name (left, optional) · client + date (+ optional version / report id) (right).
 * Compose with `ReportPrintFooter` or use `ReportPrintChrome` for both.
 */
export function ReportPrintHeader({ audit, visibility }: ReportPrintHeaderProps) {
  const v = { ...headerDefaults, ...visibility };
  return (
    <div className="cb-report-print-header" aria-hidden>
      <div className="cb-report-print-header-inner">
        {v.showModelName ? (
          <div className="cb-report-print-header-model">{audit.modelDisplayName}</div>
        ) : (
          <div className="cb-report-print-header-model" />
        )}
        <div className="cb-report-print-header-meta">
          <div>{audit.clientDisplayName}</div>
          <div>{audit.generatedAtLabel}</div>
          {v.showVersion ? <div>Version: {audit.versionLabel}</div> : null}
          {v.showReportId ? <div>Report ID: {audit.reportId}</div> : null}
          {audit.reportExportZoneLabel ? <div>{audit.reportExportZoneLabel}</div> : null}
        </div>
      </div>
    </div>
  );
}

export type ReportPrintFooterProps = {
  /** Default: canonical PDF copyright line. Hidden when Playwright supplies the Chromium footer band. */
  printFooterText?: string;
};

/**
 * In-page legal line for print. Hidden when Playwright supplies the Chromium footer band.
 */
export function ReportPrintFooter({ printFooterText }: ReportPrintFooterProps) {
  const footer = printFooterText ?? CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER;
  return <div className="cb-report-print-footer">{footer}</div>;
}

export type ReportPrintChromeProps = {
  audit: ReportAuditMeta;
  printFooterText?: string;
  printHeaderVisibility?: ReportPrintHeaderVisibility;
};

/**
 * Fixed print band: model name (left) + client / date (+ optional version / report id) (right), plus in-page legal when not using Chromium footer.
 * Import `@cb/advisory-graph/reports/print.css` for `.cb-report-print-*` rules.
 * Playwright PDF with `renderPdf({ playwrightFooter })` adds a class on `<html>` that hides
 * this in-page footer (Chromium supplies the canonical legal band + pagination instead).
 */
export function ReportPrintChrome({ audit, printFooterText, printHeaderVisibility }: ReportPrintChromeProps) {
  return (
    <>
      <ReportPrintHeader audit={audit} visibility={printHeaderVisibility} />
      <ReportPrintFooter printFooterText={printFooterText} />
    </>
  );
}
