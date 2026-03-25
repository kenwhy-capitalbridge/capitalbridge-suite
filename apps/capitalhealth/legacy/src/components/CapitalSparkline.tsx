import * as React from 'react';

type Point = { month: number; total: number };

type Props = {
  data: Point[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  round?: boolean;
  ariaLabel?: string;
  /** Depletion marker: vertical line + dot at this month */
  markerMonth?: number;
  showMarker?: boolean;
  markerColor?: string;
  markerDash?: string;
  markerWidth?: number;
  markerDotRadius?: number;
  markerLabel?: string;
  /** Axis labels: e.g. "Time (months)" and "Capital". When set, axis lines and tick numbers are also drawn. */
  xAxisLabel?: string;
  yAxisLabel?: string;
  /** Format y-axis tick values (e.g. (v) => `${v/1000}k`). Default: compact k/m. */
  yTickFormatter?: (value: number) => string;
};

export const CapitalSparkline: React.FC<Props> = ({
  data,
  width = 160,
  height = 40,
  stroke = '#E6C05D',
  fill = 'rgba(230,192,93,0.2)',
  strokeWidth = 2,
  round = true,
  ariaLabel = 'Capital over time sparkline',

  markerMonth,
  showMarker = true,
  markerColor = '#FF7A59',
  markerDash = '3,3',
  markerWidth = 1.5,
  markerDotRadius = 2.5,
  markerLabel,
  xAxisLabel,
  yAxisLabel,
  yTickFormatter = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(/\.0$/, '')}m` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v)),
}) => {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} role="img" aria-label={ariaLabel} />;
  }

  const xs = data.map((d) => d.month);
  const ys = data.map((d) => d.total);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const showAxes = Boolean(xAxisLabel || yAxisLabel);
  const isNarrow = width < 420;
  const marginLeft = showAxes ? (isNarrow ? 28 : 42) : 1;
  const marginRight = showAxes ? 14 : 1;
  const marginTop = showAxes ? 10 : 1;
  const marginBottom = showAxes ? 20 : 1;
  const pad = showAxes ? 0 : 1;
  const yAxisGap = yAxisLabel && isNarrow ? 2 : yAxisLabel ? 6 : 0;
  const yAxisLabelWidth = yAxisLabel && isNarrow ? 14 : 18;

  const chartLeft = marginLeft + pad;
  const chartRight = width - marginRight - pad;
  const chartTop = marginTop + pad;
  const chartBottom = height - marginBottom - pad;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const xScale = (x: number) =>
    chartLeft + ((x - minX) / (maxX - minX || 1)) * chartWidth;

  const yScale = (y: number) => {
    const t = (y - minY) / (maxY - minY || 1);
    return chartBottom - t * chartHeight;
  };

  const path = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.month)} ${yScale(d.total)}`)
    .join(' ');

  const area = [
    `M ${xScale(data[0].month)} ${yScale(data[0].total)}`,
    ...data.slice(1).map((d) => `L ${xScale(d.month)} ${yScale(d.total)}`),
    `L ${xScale(data[data.length - 1].month)} ${chartBottom}`,
    `L ${xScale(data[0].month)} ${chartBottom}`,
    'Z',
  ].join(' ');

  function yAtMonth(m: number): number | null {
    if (m < minX || m > maxX) return null;
    const exact = data.find((d) => d.month === m);
    if (exact) return yScale(exact.total);
    for (let i = 0; i < data.length - 1; i++) {
      const a = data[i];
      const b = data[i + 1];
      if (m >= a.month && m <= b.month) {
        const t = (m - a.month) / (b.month - a.month || 1);
        const y = a.total + t * (b.total - a.total);
        return yScale(y);
      }
    }
    return null;
  }

  const showDepletionMarker = showMarker && typeof markerMonth === 'number';
  const markerX = showDepletionMarker
    ? xScale(Math.max(minX, Math.min(maxX, markerMonth!)))
    : null;
  const markerY =
    showDepletionMarker && typeof markerX === 'number'
      ? yAtMonth(markerMonth!)
      : null;

  const markerTitle =
    markerLabel ??
    (typeof markerMonth === 'number'
      ? `Depletion at month ${markerMonth}${markerMonth >= 12 ? (() => { const y = Math.floor(markerMonth / 12); const m = Math.round(markerMonth % 12); return ` (~${y} years${m ? ` ${m} months` : ''})`; })() : ''}`
      : '');

  // Nice tick values for x (months) and y (capital)
  const xTickStep = maxX - minX <= 24 ? 6 : maxX - minX <= 120 ? 12 : 24;
  const xTicks: number[] = [];
  for (let v = Math.floor(minX / xTickStep) * xTickStep; v <= maxX + 1; v += xTickStep) {
    if (v >= minX) xTicks.push(v);
  }
  if (xTicks.length === 0 || xTicks[xTicks.length - 1] < maxX) xTicks.push(maxX);

  const yRange = maxY - minY || 1;
  const yMagnitude = Math.pow(10, Math.floor(Math.log10(yRange)));
  const yStep = yMagnitude * (yRange / yMagnitude >= 5 ? 1 : yRange / yMagnitude >= 2 ? 0.5 : 0.2);
  const yTicks: number[] = [];
  for (let v = Math.floor(minY / yStep) * yStep; v <= maxY + yStep * 0.5; v += yStep) {
    if (v >= minY - 1e-6) yTicks.push(v);
  }
  if (yTicks.length === 0 || yTicks[yTicks.length - 1] < maxY) yTicks.push(maxY);

  const axisColor = 'rgba(246,245,241,0.5)';
  const tickFontSize = 9;

  return (
    <div
      style={{
        position: 'relative',
        display: yAxisLabel ? 'flex' : 'inline-block',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: yAxisGap,
        lineHeight: 0,
      }}
    >
      {yAxisLabel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: yAxisLabelWidth,
            minWidth: yAxisLabelWidth,
            alignSelf: 'stretch',
            paddingRight: isNarrow ? 2 : 4,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: 'rgba(246,245,241,0.85)',
              whiteSpace: 'nowrap',
              transform: 'rotate(-90deg)',
              transformOrigin: 'center center',
            }}
          >
            {yAxisLabel}
          </span>
        </div>
      )}
      <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          style={{ display: 'block' }}
        >
          {showAxes && (
            <g aria-hidden>
              {/* Y-axis line */}
              <line
                x1={chartLeft}
                y1={chartTop}
                x2={chartLeft}
                y2={chartBottom}
                stroke={axisColor}
                strokeWidth={1}
              />
              {/* X-axis line */}
              <line
                x1={chartLeft}
                y1={chartBottom}
                x2={chartRight}
                y2={chartBottom}
                stroke={axisColor}
                strokeWidth={1}
              />
              {/* Y-axis ticks and labels */}
              {yTicks.map((v) => {
                const y = yScale(v);
                if (y < chartTop - 1 || y > chartBottom + 1) return null;
                return (
                  <g key={v}>
                    <line
                      x1={chartLeft}
                      y1={y}
                      x2={chartLeft - 4}
                      y2={y}
                      stroke={axisColor}
                      strokeWidth={1}
                    />
                    <text
                      x={chartLeft - 6}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill="rgba(246,245,241,0.85)"
                      fontSize={tickFontSize}
                    >
                      {yTickFormatter(v)}
                    </text>
                  </g>
                );
              })}
              {/* X-axis ticks and labels */}
              {xTicks.map((v) => {
                const x = xScale(v);
                if (x < chartLeft - 1 || x > chartRight + 1) return null;
                return (
                  <g key={v}>
                    <line
                      x1={x}
                      y1={chartBottom}
                      x2={x}
                      y2={chartBottom + 4}
                      stroke={axisColor}
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={chartBottom + 14}
                      textAnchor="middle"
                      fill="rgba(246,245,241,0.85)"
                      fontSize={tickFontSize}
                    >
                      {v}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
          <path d={area} fill={fill} stroke="none" />
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin={round ? 'round' : 'miter'}
            strokeLinecap={round ? 'round' : 'butt'}
          >
            <title>Capital over time</title>
          </path>

          {showDepletionMarker && typeof markerX === 'number' && (
            <>
              <line
                x1={markerX}
                y1={chartTop}
                x2={markerX}
                y2={chartBottom}
                stroke={markerColor}
                strokeWidth={markerWidth}
                strokeDasharray={markerDash}
                opacity={0.9}
              >
                <title>{markerTitle}</title>
              </line>
              {typeof markerY === 'number' && (
                <circle
                  cx={markerX}
                  cy={markerY}
                  r={markerDotRadius}
                  fill={markerColor}
                  stroke="white"
                  strokeWidth={1}
                >
                  <title>{markerTitle}</title>
                </circle>
              )}
            </>
          )}
        </svg>
        {xAxisLabel && (
          <div
            style={{
              textAlign: 'center',
              paddingTop: 4,
              fontSize: 10,
              color: 'rgba(246,245,241,0.85)',
            }}
          >
            {xAxisLabel}
          </div>
        )}
      </div>
    </div>
  );
};
