"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  CB_REPORT_CHART_WRAP,
  REPORT_FONT_DISPLAY,
  ReportHeading,
  ReportProse,
} from "@cb/advisory-graph/reports";

export type PdfChartBlockProps = {
  /**
   * Chart title (plain string uses default title chrome + `titleStyle`).
   * Pass a React node to render a custom title block (e.g. title + subtitle in one unit).
   */
  title?: ReactNode;
  /** Optional title colour / font override (e.g. Capital Stress print gold). Applied when `title` is a string. */
  titleStyle?: CSSProperties;
  /**
   * Label above `whatThisShows` prose. Default "What this shows".
   * Pass `false` to omit the heading so microcopy can sit directly under the chart title.
   */
  whatThisShowsHeading?: string | false;
  /** Pass `false` to omit the whole “What this shows” block (use when title slot already includes lead copy). */
  whatThisShows: ReactNode | false;
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
  whatThisShowsHeading,
  whatThisShows,
  whyThisMatters,
  children,
  interpretation,
  className = "",
}: PdfChartBlockProps) {
  const wrap = `${CB_REPORT_CHART_WRAP} ${className}`.trim();
  const titleIsString = typeof title === "string";

  const titleNode =
    title != null && title !== false ? (
      titleIsString ? (
        <div
          className="cb-pdf-chart-block-title m-0 mb-2 text-[11pt] font-bold leading-snug text-[#0d3a1d] print:mb-2"
          style={{ fontFamily: REPORT_FONT_DISPLAY, ...titleStyle }}
        >
          {title}
        </div>
      ) : (
        <div className="cb-pdf-chart-block-title-slot m-0 mb-2 print:mb-2">{title}</div>
      )
    ) : null;

  /** Title / lead copy stay with the chart but outside `<figure>` (figure = plot + legend only). */
  return (
    <div
      className="cb-pdf-chart-block"
      style={{
        margin: "1em 0",
        breakInside: "avoid" as const,
        pageBreakInside: "avoid" as const,
      }}
    >
      {titleNode}
      <figure className={wrap} style={{ margin: 0, breakInside: "avoid" as const, pageBreakInside: "avoid" as const }}>
      {whatThisShows !== false ? (
        <>
          {whatThisShowsHeading !== false ? (
            <ReportHeading level={3} variant="inline" keepWithNext className="cb-avoid-orphan-heading">
              {whatThisShowsHeading ?? "What this shows"}
            </ReportHeading>
          ) : null}
          <ReportProse className="text-[rgba(43,43,43,0.95)]">{whatThisShows}</ReportProse>
        </>
      ) : null}
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
    </div>
  );
}
