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
    { label: "Coverage", value: incomplete ? "Pending" : signalLabel(coverage), helper: "Income coverage" },
    { label: "Buffer", value: incomplete ? "Pending" : signalLabel(buffer), helper: "Liquidity buffer" },
    { label: "Resilience", value: incomplete ? "Pending" : signalLabel(resilience), helper: "Stress resilience" },
  ];
  return (
    <DashboardPanel title="Coverage / Buffer / Resilience">
      <div style={grid}>
        {items.map((item) => (
          <div key={item.label} style={card}>
            <div style={top}>
              <ShieldCheck size={13} color={CB.gold} strokeWidth={2} />
              <p style={lab}>{item.label}</p>
            </div>
            <p style={val}>{item.value}</p>
            <p style={help}>
              {incomplete ? "Signals unlock after models complete." : item.helper}
            </p>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  fontFamily: fontSans,
};

const card: CSSProperties = {
  border: `1px solid rgba(255,204,106,0.28)`,
  borderRadius: 12,
  background: "rgba(5,28,16,0.75)",
  padding: "8px 8px 9px",
};

const top: CSSProperties = { display: "flex", alignItems: "center", gap: 5 };

const lab: CSSProperties = {
  margin: 0,
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "rgba(246,245,241,0.72)",
};

const val: CSSProperties = {
  margin: "5px 0 0",
  fontFamily: fontSerif,
  fontSize: 19,
  fontWeight: 600,
  color: CB.white,
  lineHeight: 1.1,
};

const help: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 9,
  lineHeight: 1.3,
  color: "rgba(246,245,241,0.58)",
};
