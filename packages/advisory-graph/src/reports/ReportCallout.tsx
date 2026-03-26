import type { ReactNode } from 'react';
import { REPORT_ACCENT, REPORT_BORDER, REPORT_BRAND_GREEN, REPORT_TEXT, REPORT_TYPE } from './tokens';

export type ReportCalloutProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Bordered block for plain-English rules, chart explanations, or scenario notes.
 */
export function ReportCallout({ title, children, className = '' }: ReportCalloutProps) {
  return (
    <div
      className={className}
      style={{
        border: `1px solid ${REPORT_BORDER}`,
        borderLeft: `4px solid ${REPORT_BRAND_GREEN}`,
        borderRadius: 4,
        padding: '0.75em 1em',
        marginBottom: '1em',
        backgroundColor: 'rgba(198, 162, 77, 0.06)',
      }}
    >
      {title ? (
        <div
          style={{
            ...REPORT_TYPE.label,
            color: REPORT_ACCENT,
            textTransform: 'uppercase',
            marginBottom: '0.35em',
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ ...REPORT_TYPE.body, color: REPORT_TEXT }}>{children}</div>
    </div>
  );
}
