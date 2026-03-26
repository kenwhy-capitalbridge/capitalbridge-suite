import type { ReactNode } from 'react';
import { REPORT_TEXT, REPORT_TYPE } from './tokens';

export type ReportBulletListProps = {
  items: ReactNode[];
  className?: string;
};

export function ReportBulletList({ items, className = '' }: ReportBulletListProps) {
  return (
    <ul
      className={className}
      style={{
        ...REPORT_TYPE.body,
        color: REPORT_TEXT,
        margin: '0 0 1em 0',
        paddingLeft: '1.25em',
        lineHeight: 1.5,
      }}
    >
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: '0.35em' }}>
          {item}
        </li>
      ))}
    </ul>
  );
}
