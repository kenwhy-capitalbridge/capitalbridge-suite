"use client";

import type { CSSProperties } from "react";
import { ShieldCheck } from "lucide-react";
import { DashboardPanel } from "./DashboardPanel";
import { CB, fontSans, fontSerif } from "./cbDashboardTokens";
import type { SignalBand } from "./lionVerdictTypes";

function signalLabel(signal?: SignalBand): string {
  if (!signal) return "Pending";
  if (signal === "STRONG") return "Strong";
  if (signal === "ADEQUATE") return "Adequate";
  if (signal === "TIGHT") return "Tight";
  if (signal === "WEAK") return "Weak";
  return "Failed";
}

type Props = {
  incomplete: boolean;
  coverage: SignalBand;
  buffer: SignalBand;
  resilience: SignalBand;
};

export function SignalCardsPanel({ incomplete, coverage, buffer, resilience }: Props) {
  const items = [
    { label: "Coverage", value: incomplete ? "Pending" : signalLabel(coverage), helper: "Income needs well covered" },
    { label: "Buffer", value: incomplete ? "Pending" : signalLabel(buffer), helper: "Healthy buffer maintained" },
    { label: "Resilience", value: incomplete ? "Pending" : signalLabel(resilience), helper: "Resilient across stress scenarios" },
  ];
  return (
    <DashboardPanel title="Coverage / Buffer / Resilience">
      <div style={grid}>
        {items.map((item) => (
          <div key={item.label} style={card}>
            <div style={top}>
              <ShieldCheck size={14} color={CB.gold} />
              <p style={lab}>{item.label}</p>
            </div>
            <p style={val}>{item.value}</p>
            <p style={help}>{incomplete ? "Signal strength appears once the required models are completed." : item.helper}</p>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  fontFamily: fontSans,
};

const card: CSSProperties = {
  border: `1px solid rgba(255,204,106,0.28)`,
  borderRadius: CB.radiusMd,
  background: "rgba(6,32,22,0.65)",
  padding: "12px 10px",
};

const top: CSSProperties = { display: "flex", alignItems: "center", gap: 6 };

const lab: CSSProperties = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(246,245,241,0.75)",
};

const val: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: fontSerif,
  fontSize: 22,
  fontWeight: 600,
  color: CB.white,
};

const help: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 10,
  lineHeight: 1.35,
  color: "rgba(246,245,241,0.65)",
};
