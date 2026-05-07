"use client";

import type { CSSProperties } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { DashboardPanel } from "./DashboardPanel";
import { CB, fontSans } from "./cbDashboardTokens";
import type { ModelKey } from "./lionVerdictTypes";

const ROWS: Array<{ key: ModelKey; label: string; priority: "HIGH" | "MEDIUM" }> = [
  { key: "income-engineering-model", label: "Income Engineering Model", priority: "HIGH" },
  { key: "capital-health-model", label: "Capital Health Model", priority: "HIGH" },
  { key: "capital-stress-model", label: "Capital Stress Model", priority: "MEDIUM" },
  { key: "forever-income-model", label: "Forever Income Model", priority: "MEDIUM" },
];

type Props = { missing: Set<string> };

export function CompletionReadinessPanel({ missing }: Props) {
  return (
    <DashboardPanel title="Model Completion / Execution Readiness">
      <div style={{ display: "grid", gap: 12, fontFamily: fontSans }}>
        {ROWS.map((row) => {
          const isMissing = missing.has(row.key);
          const pct = isMissing ? 0 : 100;
          return (
            <div key={row.key} style={rowStyle}>
              <div style={iconCell}>
                {isMissing ? <AlertTriangle size={15} color={CB.gold} /> : <CheckCircle2 size={15} color={CB.success} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={rowTop}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{row.label}</span>
                  <span style={{ color: "rgba(246,245,241,0.75)", fontSize: 13 }}>{pct}%</span>
                </div>
                <div style={track}>
                  <div style={{ ...fill, width: `${pct}%` }} />
                </div>
              </div>
              <span style={isMissing ? chipMissing : chipDone}>{isMissing ? `${row.priority} Missing` : "Completed"}</span>
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "32px 1fr auto",
  gap: 10,
  alignItems: "center",
  paddingBottom: 12,
  borderBottom: "1px solid rgba(255,204,106,0.14)",
};

const iconCell: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: `1px solid rgba(255,204,106,0.35)`,
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.15)",
};

const rowTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 6,
};

const track: CSSProperties = {
  height: 7,
  borderRadius: 999,
  background: "rgba(246,245,241,0.1)",
  overflow: "hidden",
};

const fill: CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: CB.success,
  transition: "width 0.35s ease",
};

const chipMissing: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  border: `1px solid rgba(255,204,106,0.45)`,
  color: CB.gold,
  borderRadius: 999,
  padding: "5px 10px",
  whiteSpace: "nowrap",
};

const chipDone: CSSProperties = {
  ...chipMissing,
  border: "1px solid rgba(110,231,160,0.45)",
  color: CB.success,
};
