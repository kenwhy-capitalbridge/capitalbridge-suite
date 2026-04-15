"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  CB_REPORT_CHART_WRAP,
  REPORT_FONT_DISPLAY,
  ReportHeading,
  ReportProse,
} from "@cb/advisory-graph/reports";

export type PdfChartBlockProps = {
  /** Chart / figure title */
  title?: string;
  /** Optional title colour / font override (e.g. Capital Stress print gold). */
  titleStyle?: CSSProperties;
  whatThisShows: ReactNode;
  whyThisMatters: ReactNode;
  children: ReactNode;
  /** Optional narrative below the chart */
  interpretation?: ReactNode;
  className?: string;
};

/**
 * Standard chart framing for all advisory PDFs: title → what → why → figure → interpretation.
 * Use this instead of raw chart mounts so spacing and narrative rhythm stay aligned with Forever Income.
 */
export function PdfChartBlock({
  title,
  titleStyle,
  whatThisShows,
  whyThisMatters,
  children,
  interpretation,
  className = "",
}: PdfChartBlockProps) {
  const wrap = `${CB_REPORT_CHART_WRAP} ${className}`.trim();
  return (
    <figure className={wrap} style={{ margin: "1em 0", pageBreakInside: "avoid" as const }}>
      {title ? (
        <div
          className="cb-pdf-chart-block-title m-0 mb-2 text-[11pt] font-bold leading-snug text-[#0d3a1d] print:mb-2"
          style={{ fontFamily: REPORT_FONT_DISPLAY, ...titleStyle }}
        >
          {title}
        </div>
      ) : null}
      <ReportHeading level={3} variant="inline" keepWithNext className="cb-avoid-orphan-heading">
        What this shows
      </ReportHeading>
      <ReportProse className="text-[rgba(43,43,43,0.95)]">{whatThisShows}</ReportProse>
      <ReportHeading level={3} variant="inline" keepWithNext className="cb-avoid-orphan-heading">
        Why this matters
      </ReportHeading>
      <ReportProse className="text-[rgba(43,43,43,0.95)]">{whyThisMatters}</ReportProse>
      <div className="cb-pdf-chart-block-figure my-3 print:my-3">{children}</div>
      {interpretation ? (
        <>
          <ReportHeading level={3} variant="inline" keepWithNext className="cb-avoid-orphan-heading mt-2 print:mt-2">
            Interpretation
          </ReportHeading>
          <ReportProse className="text-[rgba(43,43,43,0.95)]">{interpretation}</ReportProse>
        </>
      ) : null}
    </figure>
  );
}
