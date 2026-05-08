"use client";

import type { CSSProperties, ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { CB, fontSans, fontSerif } from "./cbDashboardTokens";

type Props = {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  verified?: boolean;
};

export function MetricCard({ icon, label, value, helper, verified }: Props) {
  return (
    <article style={cardStyle}>
      <div style={topRow}>
        <div style={iconWrap}>{icon}</div>
        <span style={statusPill(verified)} title={verified ? "Verified" : "Pending verification"}>
          {verified ? <CheckCircle2 size={14} strokeWidth={2.5} color={CB.success} /> : null}
          {verified ? "Verified" : "Pending"}
        </span>
      </div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value}</p>
      <p style={helperStyle}>{helper}</p>
    </article>
  );
}

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,204,106,0.34)",
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(12,48,24,0.95) 0%, rgba(8,31,16,0.92) 100%)",
  boxShadow: "0 14px 34px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,204,106,0.14)",
  padding: "16px 16px 14px",
  minHeight: 154,
  fontFamily: fontSans,
};

const topRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
  gap: 10,
};

const iconWrap: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: `1px solid rgba(255,204,106,0.68)`,
  color: CB.gold,
  display: "grid",
  placeItems: "center",
  background: "radial-gradient(circle at 35% 35%, rgba(255,204,106,0.2), rgba(0,0,0,0.32))",
};

function statusPill(verified?: boolean): CSSProperties {
  return {
    borderRadius: 999,
    border: verified ? "1px solid rgba(110,231,160,0.5)" : "1px solid rgba(255,204,106,0.45)",
    color: verified ? CB.success : CB.gold,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "3px 8px",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    background: verified ? "rgba(110,231,160,0.08)" : "rgba(255,204,106,0.1)",
  };
}

const labelStyle: CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 10,
  fontWeight: 800,
  color: "rgba(246,245,241,0.72)",
};

const valueStyle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "clamp(24px, 2.1vw, 31px)",
  fontFamily: fontSerif,
  lineHeight: 1.02,
  color: CB.white,
  fontWeight: 600,
};

const helperStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 12,
  lineHeight: 1.35,
  color: "rgba(246,245,241,0.86)",
};
