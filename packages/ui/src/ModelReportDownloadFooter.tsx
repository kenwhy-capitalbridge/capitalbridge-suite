"use client";

import type { ReactNode } from "react";

const DISCLAIMER =
  "This calculator is for advisory purposes only. Projections are based on your assumptions and do not guarantee future performance.";
const RECORDS_LINE = "Please save or print a copy for your records.";
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

  return (
    <footer
      data-cb-model-report-footer
      className={`no-print mt-20 w-full max-w-none border-t border-[#FFCC6A]/30 px-4 pb-20 pt-14 text-center sm:mt-24 sm:pb-28 sm:pt-16 lg:mt-32 lg:pb-36 lg:pt-20 ${className}`.trim()}
    >
      <p className="mx-auto max-w-2xl text-xs font-light leading-relaxed text-[#E8E6E0]/90 md:text-sm">
        {DISCLAIMER}
      </p>
      <p className="mx-auto mt-10 max-w-xl text-sm font-bold text-[#FFCC6A] sm:mt-12 md:mt-14 md:text-base lg:mt-16">
        {RECORDS_LINE}
      </p>
      {statusSlot ? <div className="mt-8 sm:mt-10 lg:mt-12">{statusSlot}</div> : null}
      <div className="mt-12 flex justify-center px-2 sm:mt-14 lg:mt-16">
        <button type="button" onClick={onDownload} disabled={disabled} className={btnClass}>
          {buttonLeading ?? <PrinterGlyph className="h-4 w-4 shrink-0" />}
          {buttonLabel}
        </button>
      </div>
    </footer>
  );
}
