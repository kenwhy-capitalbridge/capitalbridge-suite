"use client";

import type { ReactNode } from "react";

const DISCLAIMER =
  "This calculator is for advisory purposes only. Projections are based on your assumptions and do not guarantee future performance.";
const RECORDS_LINE = "Please keep a PDF copy for your records.";
export const MODEL_REPORT_DOWNLOAD_CTA_LABEL = "DOWNLOAD REPORT";

function PrinterGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
      />
    </svg>
  );
}

export type ModelReportDownloadFooterProps = {
  onDownload: () => void;
  disabled?: boolean;
  /** Shown inside the CTA (e.g. "Generating…"). Defaults to DOWNLOAD REPORT. */
  buttonLabel?: string;
  /** Replaces the printer icon (e.g. spinner). */
  buttonLeading?: ReactNode;
  /**
   * If set, used as the full button `className` (e.g. Forever unsustainable disabled chrome).
   * Otherwise `pf-chrome-gold-btn pf-chrome-gold-btn--report` is applied.
   */
  buttonClassName?: string;
  /** Optional lines between the records prompt and the button (e.g. Capital Health status). */
  statusSlot?: ReactNode;
  className?: string;
};

/**
 * Shared end-of-page block for model apps: gold rule, disclaimer, bold records line, download CTA.
 */
export function ModelReportDownloadFooter({
  onDownload,
  disabled,
  buttonLabel = MODEL_REPORT_DOWNLOAD_CTA_LABEL,
  buttonLeading,
  buttonClassName,
  statusSlot,
  className = "",
}: ModelReportDownloadFooterProps) {
  const btnClass =
    buttonClassName?.trim() ??
    "pf-chrome-gold-btn pf-chrome-gold-btn--report touch-manipulation disabled:opacity-60";

  const pendingVisual = Boolean(disabled && buttonLeading);
  const pendingAriaLabel =
    pendingVisual && typeof buttonLabel === "string" && buttonLabel.trim().length > 0
      ? buttonLabel
      : pendingVisual
        ? MODEL_REPORT_DOWNLOAD_CTA_LABEL + " — loading"
        : undefined;

  return (
    <footer
      data-cb-model-report-footer
      className={`cb-model-report-footer no-print ${className}`.trim()}
    >
      {/* Line of space above the gold rule (margin above footer can collapse with prior section). */}
      <div className="cb-model-report-footer-spacer-above-rule" aria-hidden />
      <div className="cb-model-report-footer-gold-block">
        <p className="mx-auto max-w-2xl text-xs font-light leading-relaxed text-[#E8E6E0]/90 md:text-sm">
          {DISCLAIMER}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm font-bold text-[#FFCC6A] md:text-base">
          {RECORDS_LINE}
        </p>
        {statusSlot ? <div className="mt-3 sm:mt-4">{statusSlot}</div> : null}
        <div className="mt-3 flex justify-center px-2 sm:mt-4">
        <button
          type="button"
          onClick={onDownload}
          disabled={disabled}
          aria-busy={pendingVisual}
          aria-label={pendingAriaLabel}
          className={btnClass}
        >
          {pendingVisual ? (
            buttonLeading
          ) : (
            <>
              {buttonLeading ?? <PrinterGlyph className="h-4 w-4 shrink-0" />}
              {buttonLabel}
            </>
          )}
        </button>
        </div>
      </div>
    </footer>
  );
}
