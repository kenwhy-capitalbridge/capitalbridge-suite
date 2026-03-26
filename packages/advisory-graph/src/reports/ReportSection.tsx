import type { CSSProperties, ReactNode } from 'react';
import { CB_REPORT_PAGE_BREAK, CB_REPORT_SECTION } from './classes';
import type { StandardReportSectionId } from './reportCatalog';

export type ReportSectionProps = {
  children: ReactNode;
  /** Stable id for TOC, deep links, and automated PDF assembly */
  sectionId?: StandardReportSectionId;
  pageBreakBefore?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function ReportSection({
  children,
  sectionId,
  pageBreakBefore = false,
  className = '',
  style,
}: ReportSectionProps) {
  const breakClass = pageBreakBefore ? CB_REPORT_PAGE_BREAK : '';
  return (
    <section
      className={`${CB_REPORT_SECTION} ${breakClass} ${className}`.trim()}
      style={style}
      data-cb-report-section={sectionId}
    >
      {children}
    </section>
  );
}
