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
      className={`no-print mt-14 w-full border-t border-[#FFCC6A]/30 px-4 pb-16 pt-10 text-center sm:mt-16 sm:pb-20 sm:pt-12 lg:mt-20 lg:pb-28 lg:pt-14 ${className}`.trim()}
    >
      <p className="mx-auto max-w-2xl text-xs font-light leading-relaxed text-[#E8E6E0]/90 md:text-sm">
        {DISCLAIMER}
      </p>
      <p className="mx-auto mt-8 max-w-xl text-sm font-bold text-[#FFCC6A] sm:mt-10 md:text-base">
        {RECORDS_LINE}
      </p>
      {statusSlot ? <div className="mt-6 sm:mt-8">{statusSlot}</div> : null}
      <div className="mt-10 flex justify-center px-2 sm:mt-12">
        <button type="button" onClick={onDownload} disabled={disabled} className={btnClass}>
          {buttonLeading ?? <PrinterGlyph className="h-4 w-4 shrink-0" />}
          {buttonLabel}
        </button>
      </div>
    </footer>
  );
}
