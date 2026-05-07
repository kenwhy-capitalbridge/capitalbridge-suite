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
        {verified ? (
          <span style={checkWrap} title="Verified">
            <CheckCircle2 size={17} strokeWidth={2.5} color={CB.success} />
          </span>
        ) : null}
      </div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value}</p>
      <p style={helperStyle}>{helper}</p>
    </article>
  );
}

const cardStyle: CSSProperties = {
  border: CB.cardBorder,
  borderRadius: CB.radiusMd,
  background: CB.cardBg,
  boxShadow: CB.shadowCard,
  padding: "16px 14px 14px",
  minHeight: 128,
  fontFamily: fontSans,
};

const topRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};

const iconWrap: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: `1px solid rgba(255,204,106,0.5)`,
  color: CB.gold,
  display: "grid",
  placeItems: "center",
  background: "rgba(43,43,43,0.2)",
};

const checkWrap: CSSProperties = {
  display: "grid",
  placeItems: "center",
  filter: "drop-shadow(0 0 6px rgba(110,231,160,0.35))",
};

const labelStyle: CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontSize: 10,
  fontWeight: 700,
  color: "rgba(246,245,241,0.65)",
};

const valueStyle: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "clamp(22px, 2.2vw, 30px)",
  fontFamily: fontSerif,
  lineHeight: 1.05,
  color: CB.white,
  fontWeight: 600,
};

const helperStyle: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 12,
  lineHeight: 1.35,
  color: CB.gold,
};
