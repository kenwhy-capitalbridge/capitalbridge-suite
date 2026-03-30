import type { CSSProperties, ReactNode } from "react";
import {
  CAPITAL_TIMELINE_SCOPE_NOTE,
  type CapitalTimelinePrintPayload,
  formatCapitalTrajectoryLabel,
} from "./capitalTimeline";

export type CapitalTimelinePrintSectionProps = {
  payload: CapitalTimelinePrintPayload;
  /** Stage label + heading typography (match model print report). */
  fontSerif: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
};

function TimelineSvg({
  points,
  textColor,
  accentColor,
  borderColor,
}: {
  points: CapitalTimelinePrintPayload["points"];
  textColor: string;
  accentColor: string;
  borderColor: string;
}): ReactNode {
  const w = 520;
  const h = 200;
  const padL = 44;
  const padR = 16;
  const padT = 14;
  const padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const ys = points.map((p) => p.y);
  const minY = 0;
  const maxY = 100;
  const ts = points.map((p) => p.t);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const tSpan = Math.max(1, tMax - tMin);

  const xAt = (t: number) => padL + ((t - tMin) / tSpan) * innerW;
  const yAt = (v: number) => padT + innerH - ((v - minY) / (maxY - minY)) * innerH;

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(p.t).toFixed(1)} ${yAt(p.y).toFixed(1)}`)
    .join(" ");

  const tickYs = [0, 50, 100];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      style={{ display: "block", maxWidth: "100%" }}
      aria-label="Capital resilience over time"
    >
      <line
        x1={padL}
        y1={yAt(0)}
        x2={padL + innerW}
        y2={yAt(0)}
        stroke={borderColor}
        strokeOpacity={0.45}
        strokeWidth={1}
      />
      {tickYs.map((tv) => (
        <g key={tv}>
          <line
            x1={padL}
            y1={yAt(tv)}
            x2={padL + innerW}
            y2={yAt(tv)}
            stroke={borderColor}
            strokeOpacity={0.2}
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <text
            x={padL - 8}
            y={yAt(tv) + 4}
            textAnchor="end"
            style={{ fill: textColor, fontSize: 9, opacity: 0.85 }}
          >
            {tv}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke={accentColor} strokeWidth={2.25} strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={`${p.t}-${p.source}-${i}`} cx={xAt(p.t)} cy={yAt(p.y)} r={4} fill={accentColor} />
      ))}
      <text
        x={padL + innerW / 2}
        y={h - 10}
        textAnchor="middle"
        style={{ fill: textColor, fontSize: 9, opacity: 0.85 }}
      >
        Time (saved reports and this export)
      </text>
    </svg>
  );
}

export function CapitalTimelinePrintSection(props: CapitalTimelinePrintSectionProps): ReactNode {
  const { payload, fontSerif, textColor, accentColor, borderColor } = props;
  const traj = formatCapitalTrajectoryLabel(payload.trajectory);
  const subtle: CSSProperties = { fontSize: "10pt", color: textColor, lineHeight: 1.5, margin: 0 };
  const labelStyle: CSSProperties = {
    fontSize: "9pt",
    fontWeight: 700,
    color: accentColor,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "0.35em",
  };

  return (
    <div
      className="cb-capital-timeline-print print-section section print-page-break-before"
      style={{ breakInside: "avoid" as const, pageBreakInside: "avoid" as const }}
    >
      <p className="cb-print-stage-label">Progression</p>
      <h2
        style={{
          fontFamily: fontSerif,
          fontSize: "14pt",
          fontWeight: 700,
          color: accentColor,
          marginBottom: "0.5em",
          textTransform: "uppercase",
        }}
      >
        Capital Timeline
      </h2>
      <p style={{ ...subtle, marginBottom: "0.75em", opacity: 0.92 }}>{payload.metricLabel}</p>
      <div className="print-chart-wrap chart-block" style={{ marginBottom: "1em" }}>
        <TimelineSvg
          points={payload.points}
          textColor={textColor}
          accentColor={accentColor}
          borderColor={borderColor}
        />
      </div>

      <div style={{ display: "grid", gap: "0.85em", marginBottom: "1.1em" }}>
        <div>
          <p style={labelStyle}>Latest change</p>
          <p style={subtle}>{payload.latestChangePlain}</p>
        </div>
        <div>
          <p style={labelStyle}>Trajectory</p>
          <p style={{ ...subtle, fontWeight: 700 }}>{traj}</p>
        </div>
      </div>

      <p
        style={{
          fontSize: "8.5pt",
          color: textColor,
          lineHeight: 1.55,
          margin: 0,
          paddingTop: "0.75em",
          borderTop: `1px solid ${borderColor}`,
          opacity: 0.88,
          fontStyle: "italic",
        }}
      >
        {CAPITAL_TIMELINE_SCOPE_NOTE}
      </p>
    </div>
  );
}
