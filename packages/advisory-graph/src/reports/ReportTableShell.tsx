import type { ReactNode } from 'react';
import { REPORT_BORDER, REPORT_TEXT, REPORT_TYPE } from './tokens';
import { CB_REPORT_TABLE_HEAD } from './classes';

export type ReportTableShellProps = {
  children: ReactNode;
  className?: string;
};

/** Wrapper for tables that should avoid page splits and repeat thead when printing. */
export function ReportTableShell({ children, className = '' }: ReportTableShellProps) {
  return (
    <div
      className={`${className}`.trim()}
      style={{ overflowX: 'auto', marginBottom: '1em', ...REPORT_TYPE.body, color: REPORT_TEXT }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: `1px solid ${REPORT_BORDER}`,
        }}
      >
        {children}
      </table>
    </div>
  );
}

export type ReportTableHeadProps = { children: ReactNode };

export function ReportTableHead({ children }: ReportTableHeadProps) {
  return <thead className={CB_REPORT_TABLE_HEAD}>{children}</thead>;
}
