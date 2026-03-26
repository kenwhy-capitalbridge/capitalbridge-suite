import type { ReactNode } from 'react';
import { REPORT_TEXT, REPORT_TYPE } from './tokens';
import { CB_REPORT_DISCLOSURE } from './classes';

export type ReportDisclosureProps = {
  children: ReactNode;
  className?: string;
};

/** Standard closing disclosure page block */
export function ReportDisclosure({ children, className = '' }: ReportDisclosureProps) {
  return (
    <div
      className={`${CB_REPORT_DISCLOSURE} ${className}`.trim()}
      style={{
        ...REPORT_TYPE.bodyLarge,
        color: REPORT_TEXT,
        textAlign: 'center',
        marginTop: '2em',
      }}
    >
      {children}
    </div>
  );
}
