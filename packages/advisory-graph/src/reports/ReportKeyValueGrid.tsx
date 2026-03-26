import type { ReactNode } from 'react';
import { REPORT_ACCENT, REPORT_TEXT, REPORT_TYPE } from './tokens';

export type ReportKeyValueRow = { key: string; value: ReactNode };

export type ReportKeyValueGridProps = {
  rows: ReportKeyValueRow[];
  columns?: 1 | 2;
  className?: string;
};

/**
 * Assumptions / snapshot facts (two-column grid by default).
 */
export function ReportKeyValueGrid({ rows, columns = 2, className = '' }: ReportKeyValueGridProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: columns === 2 ? 'repeat(2, 1fr)' : '1fr',
        gap: '0.5em 2em',
        ...REPORT_TYPE.body,
        color: REPORT_TEXT,
      }}
    >
      {rows.map((row) => (
        <div key={row.key}>
          <strong style={{ color: REPORT_ACCENT }}>{row.key}:</strong> {row.value}
        </div>
      ))}
    </div>
  );
}
