import type { ReactNode } from 'react';
import { REPORT_ACCENT, REPORT_BRAND_GREEN, REPORT_FONT_DISPLAY, REPORT_TEXT, REPORT_TYPE } from './tokens';
import { CB_REPORT_KEEP_WITH_NEXT } from './classes';

export type ReportHeadingProps = {
  level: 2 | 3;
  variant?: 'section' | 'sectionSmall' | 'inline';
  children: ReactNode;
  className?: string;
  keepWithNext?: boolean;
};

/**
 * H2: gold rule (major section). H3: dark inline subheading.
 */
export function ReportHeading({
  level,
  variant = 'section',
  children,
  className = '',
  keepWithNext = false,
}: ReportHeadingProps) {
  const wrap = keepWithNext ? CB_REPORT_KEEP_WITH_NEXT : '';

  if (level === 2) {
    const isSmall = variant === 'sectionSmall';
    return (
      <h2
        className={`${wrap} ${className}`.trim()}
        style={{
          fontFamily: REPORT_FONT_DISPLAY,
          ...(isSmall ? REPORT_TYPE.sectionH2Small : REPORT_TYPE.sectionH2),
          color: isSmall ? REPORT_ACCENT : REPORT_BRAND_GREEN,
          marginTop: 0,
          marginBottom: '0.5em',
          borderBottom: isSmall ? undefined : `2px solid ${REPORT_BRAND_GREEN}`,
          paddingBottom: isSmall ? undefined : '0.25em',
          textTransform: isSmall ? 'uppercase' : undefined,
        }}
      >
        {children}
      </h2>
    );
  }

  return (
    <h3
      className={`${wrap} ${className}`.trim()}
      style={{
        ...REPORT_TYPE.sectionH3,
        color: REPORT_TEXT,
        marginTop: variant === 'inline' ? '1em' : '1.25em',
        marginBottom: '0.5em',
      }}
    >
      {children}
    </h3>
  );
}
