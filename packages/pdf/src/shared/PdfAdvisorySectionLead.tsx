"use client";

import { ReportHeading, ReportProse } from "@cb/advisory-graph/reports";

export type PdfAdvisorySectionLeadProps = {
  /** e.g. `Section A — Opening` */
  stageLabel: string;
  /** Short human title under the stage line, e.g. `Opening` or `Advisor Read` */
  title: string;
  whatThisShows: string;
  whyThisMatters: string;
};

/**
 * Standard section opener for advisory PDFs: stage ribbon + title + “What this shows” + “Why this matters”.
 * Use once at the start of each Section A / B / C block (Forever = source of truth).
 */
export function PdfAdvisorySectionLead({
  stageLabel,
  title,
  whatThisShows,
  whyThisMatters,
}: PdfAdvisorySectionLeadProps) {
  return (
    <header className="cb-advisory-doc-section-divider">
      <div className="cb-print-stage-label cb-advisory-doc-stage-label">{stageLabel}</div>
      <ReportHeading level={2} variant="sectionSmall" className="cb-advisory-doc-section-divider-title">
        {title}
      </ReportHeading>
      <ReportHeading level={3} variant="inline" keepWithNext className="cb-avoid-orphan-heading mt-4">
        What this shows
      </ReportHeading>
      <ReportProse className="text-[rgba(43,43,43,0.95)]">{whatThisShows}</ReportProse>
      <ReportHeading level={3} variant="inline" keepWithNext className="cb-avoid-orphan-heading">
        Why this matters
      </ReportHeading>
      <ReportProse className="text-[rgba(43,43,43,0.95)]">{whyThisMatters}</ReportProse>
    </header>
  );
}
