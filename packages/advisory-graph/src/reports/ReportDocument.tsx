import type { ReactNode } from 'react';
import {
  CB_REPORT_ROOT,
  CB_REPORT_TIER_FULL,
  CB_REPORT_TIER_TRIAL,
} from './classes';
import type { ReportTier } from './reportCatalog';

export type ReportDocumentProps = {
  id?: string;
  tier?: ReportTier;
  children: ReactNode;
  /** Extra classes (e.g. legacy `print-report-root` for existing @media print rules) */
  className?: string;
};

/**
 * Root of every advisory PDF/print tree. Sets tier hook for shared trial vs full styling.
 */
export function ReportDocument({
  id = 'cb-advisory-report',
  tier = 'full',
  className = '',
  children,
}: ReportDocumentProps) {
  const tierClass = tier === 'trial' ? CB_REPORT_TIER_TRIAL : CB_REPORT_TIER_FULL;
  return (
    <div
      id={id}
      className={`${CB_REPORT_ROOT} ${tierClass} ${className}`.trim()}
      data-cb-report-tier={tier}
    >
      {children}
    </div>
  );
}
