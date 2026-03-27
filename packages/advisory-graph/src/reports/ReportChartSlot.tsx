import type { ReactNode } from 'react';
import { CB_REPORT_CHART_WRAP } from './classes';
import { REPORT_FONT_DISPLAY, REPORT_MUTED, REPORT_TEXT } from './tokens';

export type ReportChartSlotProps = {
  /** Chart title shown above the figure */
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  /** Short legend or series description */
  legend?: string;
  /** Caption under the title (accessibility / figure label) */
  caption?: string;
  /** One or two plain-English lines below the chart */
  explanation?: string | readonly string[];
  children: ReactNode;
  className?: string;
};

const defaultExplanation =
  'This chart summarises the simulation using your inputs. Read the axes and legend before drawing conclusions.';

/**
 * Wrapper for charts — print-safe, optional title/axes/legend/explanation.
 * Prefer passing explanation; a generic fallback applies when none is supplied.
 */
export function ReportChartSlot({
  title,
  xAxisLabel,
  yAxisLabel,
  legend,
  caption,
  explanation,
  children,
  className = '',
}: ReportChartSlotProps) {
  const lines: string[] = explanation
    ? typeof explanation === 'string'
      ? [explanation]
      : [...explanation]
    : [defaultExplanation];

  return (
    <figure
      className={`${CB_REPORT_CHART_WRAP} ${className}`.trim()}
      style={{ margin: '1em 0', pageBreakInside: 'avoid' as const }}
    >
      {title ? (
        <div
          style={{
            fontSize: '11pt',
            fontWeight: 700,
            color: REPORT_TEXT,
            marginBottom: '0.35em',
            fontFamily: REPORT_FONT_DISPLAY,
          }}
        >
          {title}
        </div>
      ) : null}
      {caption ? (
        <figcaption style={{ fontSize: '9pt', marginBottom: '0.5em', color: REPORT_MUTED }}>{caption}</figcaption>
      ) : null}
      {(xAxisLabel || yAxisLabel || legend) ? (
        <div
          style={{
            fontSize: '8.5pt',
            color: REPORT_MUTED,
            marginBottom: '0.5em',
            lineHeight: 1.4,
          }}
        >
          {xAxisLabel ? <div>Horizontal axis: {xAxisLabel}</div> : null}
          {yAxisLabel ? <div>Vertical axis: {yAxisLabel}</div> : null}
          {legend ? <div>Legend: {legend}</div> : null}
        </div>
      ) : null}
      {children}
      <div style={{ fontSize: '9pt', color: REPORT_MUTED, marginTop: '0.65em', lineHeight: 1.45 }}>
        {lines.map((line, i) => (
          <p key={i} style={{ margin: i === 0 ? '0 0 0.35em' : '0 0 0.35em' }}>
            {line}
          </p>
        ))}
      </div>
    </figure>
  );
}
