"use client";

import type { CSSProperties } from "react";
import { CheckCircle2 } from "lucide-react";
import { DashboardPanel } from "./DashboardPanel";
import { CB, fontSans } from "./cbDashboardTokens";

type Props = {
  /** When true, render dual-line chart from real series; otherwise premium pending. */
  hasProjectionData: boolean;
};

/**
 * Desired vs Supported Income — chart-forward panel.
 * Pending curves are non-data visual scaffolding only (labeled).
 */
export function PrimaryIncomeChartPanel({ hasProjectionData }: Props) {
  return (
    <DashboardPanel
      major
      title="Desired vs Supported Income"
      titleRight={
        <div style={legendStyle}>
          <span style={legendItem}>
            <span style={{ ...swatch, background: CB.gold }} />
            Desired Income
          </span>
          <span style={legendItem}>
            <span style={{ ...swatch, background: CB.success }} />
            Supported Income
          </span>
        </div>
      }
    >
      <div style={chartOuter}>
        <div style={yAxis} aria-hidden>
          <span style={yLab}>High</span>
          <span style={yLab}>Low</span>
        </div>
        <div style={chartShell}>
          {!hasProjectionData ? (
            <>
              <svg viewBox="0 0 400 220" preserveAspectRatio="none" style={svgFull} aria-hidden>
                <defs>
                  <linearGradient id="wellFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(3,18,10,0.25)" />
                    <stop offset="100%" stopColor="rgba(3,18,10,0.65)" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="400" height="220" fill="url(#wellFade)" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1="28"
                    y1={24 + i * 34}
                    x2="388"
                    y2={24 + i * 34}
                    stroke="rgba(255,204,106,0.07)"
                    strokeWidth="1"
                  />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={36 + i * 48}
                    y1="18"
                    x2={36 + i * 48}
                    y2="202"
                    stroke="rgba(255,204,106,0.05)"
                    strokeWidth="1"
                  />
                ))}
                <path
                  d="M36 168 C 100 145, 160 118, 220 92 S 320 48, 388 28"
                  fill="none"
                  stroke="rgba(255,204,106,0.28)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <path
                  d="M36 174 C 110 152, 175 122, 235 98 S 328 62, 388 42"
                  fill="none"
                  stroke="rgba(110,231,160,0.26)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
              </svg>
              <div style={pendingBox}>
                <CheckCircle2 size={17} color={CB.gold} style={{ opacity: 0.9, flexShrink: 0 }} />
                <p style={pendingText}>
                  Desired income comparison will appear once income targets and model outputs are available.
                </p>
              </div>
              <p style={scaffoldNote}>Non-data layout preview — not live projections</p>
            </>
          ) : (
            <div style={pendingBox}>
              <CheckCircle2 size={17} color={CB.success} style={{ flexShrink: 0 }} />
              <p style={pendingText}>Supported income projections confirmed.</p>
            </div>
          )}
        </div>
      </div>
      <div style={xAxis}>
        {["Y1", "Y5", "Y10", "Y15", "Y20", "Y25", "Y30"].map((t) => (
          <span key={t} style={xTick}>
            {t}
          </span>
        ))}
      </div>
    </DashboardPanel>
  );
}

const legendStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  fontFamily: fontSans,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: "rgba(246,245,241,0.88)",
};

const legendItem: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5 };

const swatch: CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: "50%",
  flexShrink: 0,
};

const chartOuter: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr)",
  gap: 4,
  alignItems: "stretch",
};

const yAxis: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "8px 0 28px",
  fontFamily: fontSans,
};

const yLab: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(246,245,241,0.42)",
};

const chartShell: CSSProperties = {
  position: "relative",
  minHeight: 200,
  maxHeight: 240,
  borderRadius: 12,
  border: `1px solid rgba(255,204,106,0.22)`,
  background:
    "linear-gradient(180deg, rgba(4,22,14,0.97) 0%, rgba(2,12,8,0.99) 55%, rgba(3,16,10,1) 100%)",
  boxShadow: CB.chartWellShadow,
  overflow: "hidden",
};

const svgFull: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
};

const pendingBox: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(400px, 88%)",
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  padding: "11px 13px",
  borderRadius: 11,
  border: `1px solid rgba(255,204,106,0.42)`,
  background: "rgba(4,18,12,0.94)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.2)",
  zIndex: 2,
};

const pendingText: CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.4,
  color: CB.white,
  fontFamily: fontSans,
};

const scaffoldNote: CSSProperties = {
  position: "absolute",
  bottom: 6,
  left: "50%",
  transform: "translateX(-50%)",
  margin: 0,
  fontSize: 9,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(246,245,241,0.45)",
  fontFamily: fontSans,
  zIndex: 3,
  pointerEvents: "none",
};

const xAxis: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  marginTop: 8,
  marginLeft: 32,
  gap: 2,
  textAlign: "center",
  fontFamily: fontSans,
};

const xTick: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.06em",
  color: "rgba(246,245,241,0.48)",
};
