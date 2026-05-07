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
 * No fake numeric series: pending state until API supplies projection data.
 */
export function PrimaryIncomeChartPanel({ hasProjectionData }: Props) {
  return (
    <DashboardPanel
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
      <div style={chartShell}>
        {!hasProjectionData ? (
          <>
            <div style={gridBg} aria-hidden />
            <svg viewBox="0 0 400 200" preserveAspectRatio="none" style={svgStyle} aria-hidden>
              <path
                d="M8 150 C 80 120, 140 100, 200 80 S 320 50, 392 36"
                fill="none"
                stroke="rgba(255,204,106,0.2)"
                strokeWidth="2"
              />
              <path
                d="M8 155 C 90 130, 150 110, 210 88 S 330 58, 392 42"
                fill="none"
                stroke="rgba(110,231,160,0.22)"
                strokeWidth="2"
              />
            </svg>
            <div style={pendingBox}>
              <CheckCircle2 size={20} color={CB.gold} style={{ opacity: 0.85, flexShrink: 0 }} />
              <p style={pendingText}>
                Desired income comparison will appear once income targets and model outputs are available.
              </p>
            </div>
          </>
        ) : (
          <div style={pendingBox}>
            <CheckCircle2 size={20} color={CB.success} style={{ flexShrink: 0 }} />
            <p style={pendingText}>Supported income projections confirmed.</p>
          </div>
        )}
      </div>
      <div style={xAxis}>
        {["Year 1", "Year 5", "Year 10", "Year 15", "Year 20", "Year 25", "Year 30"].map((t) => (
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
  gap: 14,
  alignItems: "center",
  flexWrap: "wrap",
  fontFamily: fontSans,
  fontSize: 11,
  color: "rgba(246,245,241,0.88)",
};

const legendItem: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6 };

const swatch: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
};

const chartShell: CSSProperties = {
  position: "relative",
  minHeight: 260,
  borderRadius: CB.radiusMd,
  border: `1px solid rgba(255,204,106,0.25)`,
  background: "linear-gradient(180deg, rgba(6,32,22,0.85), rgba(4,20,14,0.92))",
  overflow: "hidden",
};

const gridBg: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(255,204,106,0.06) 32px)`,
  pointerEvents: "none",
};

const svgStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  opacity: 0.9,
};

const pendingBox: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(420px, 90%)",
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: "14px 16px",
  borderRadius: CB.radiusMd,
  border: CB.cardBorder,
  background: "rgba(4,22,14,0.92)",
  boxShadow: "0 0 20px rgba(0,0,0,0.35)",
};

const pendingText: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.45,
  color: CB.white,
  fontFamily: fontSans,
};

const xAxis: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  marginTop: 10,
  gap: 4,
  textAlign: "center",
  fontFamily: fontSans,
};

const xTick: CSSProperties = {
  fontSize: 10,
  color: "rgba(246,245,241,0.55)",
};
