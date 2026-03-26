import type { ReactNode } from 'react';
import { REPORT_TEXT, REPORT_TYPE } from './tokens';

export type ReportProseProps = {
  children: ReactNode;
  /** Slightly larger body for lead paragraphs */
  lead?: boolean;
  className?: string;
};

export function ReportProse({ children, lead = false, className = '' }: ReportProseProps) {
  return (
    <p
      className={className}
      style={{
        ...(lead ? REPORT_TYPE.bodyLarge : REPORT_TYPE.body),
        color: REPORT_TEXT,
        marginTop: 0,
        marginBottom: '0.75em',
      }}
    >
      {children}
    </p>
  );
}
