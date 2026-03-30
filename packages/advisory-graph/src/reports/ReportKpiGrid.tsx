import type { ReactNode } from 'react';
import { REPORT_ACCENT, REPORT_BORDER, REPORT_TEXT } from './tokens';

export type ReportKpiGridProps = {
  children: ReactNode;
  minColWidthPx?: number;
  className?: string;
};

/**
 * Responsive metric strip (executive summary cards).
 */
export function ReportKpiGrid({ children, minColWidthPx = 140, className = '' }: ReportKpiGridProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidthPx}px, 1fr))`,
        gap: '1em',
        marginBottom: '1.5em',
      }}
    >
      {children}
    </div>
  );
}

export type ReportKpiCardProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
};

export function ReportKpiCard({ label, value, sub, className = '' }: ReportKpiCardProps) {
  return (
    <div
      className={className}
      style={{
        border: `1px solid ${REPORT_BORDER}`,
        borderRadius: 4,
        padding: '1em',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '9pt',
          fontWeight: 700,
          color: REPORT_ACCENT,
          textTransform: 'uppercase',
          marginBottom: '0.25em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '14pt', fontWeight: 700, color: REPORT_TEXT }}>{value}</div>
      {sub ? (
        <div style={{ fontSize: '9pt', color: REPORT_TEXT, marginTop: '0.25em' }}>{sub}</div>
      ) : null}
    </div>
  );
}
