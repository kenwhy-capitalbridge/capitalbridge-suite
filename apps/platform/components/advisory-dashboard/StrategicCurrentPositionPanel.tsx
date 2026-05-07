"use client";

import type { CSSProperties, ReactNode } from "react";
import { Award, Flag, Gauge, ShieldCheck } from "lucide-react";
import { DashboardPanel } from "./DashboardPanel";
import { CB, fontSans, fontSerif } from "./cbDashboardTokens";
import type { ExecutionGateLevel } from "./lionVerdictTypes";

type Props = {
  executionGate: ExecutionGateLevel;
  missingCount: number;
};

export function StrategicCurrentPositionPanel({ executionGate, missingCount }: Props) {
  const ready = executionGate === "ALLOWED" && missingCount === 0;

  return (
    <DashboardPanel title="Current Position" emphasize>
      <div style={headerGrid}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={ready ? titleReady : titleIncomplete}>{ready ? "Execution Ready" : "Assessment Incomplete"}</p>
          <p style={descStyle}>
            {ready
              ? "All four capital models are completed and verified. The system has validated sufficient inputs to activate execution pathways with confidence."
              : "The system cannot confirm execution readiness until the required capital models are completed."}
          </p>
          <div style={rows}>
            <Insight icon={<Gauge size={15} />} label="What is happening">
              {ready
                ? "All four capital models are complete and aligned. Execution pathways are available."
                : "Required model inputs are missing or incomplete, so the system is withholding final execution guidance."}
            </Insight>
            <Insight icon={<Flag size={15} />} label="What must be done">
              {ready
                ? "Activate the recommended pathway and implement your execution plan."
                : "Complete the required capital models to unlock the full execution pathway."}
            </Insight>
            {ready ? (
              <Insight icon={<ShieldCheck size={15} />} label="Outcome">
                Your capital structure is positioned for sustainable income and long-term resilience.
              </Insight>
            ) : null}
          </div>
        </div>
        <div style={laurel} aria-hidden>
          <Award size={44} strokeWidth={1.1} color={CB.gold} />
        </div>
      </div>
    </DashboardPanel>
  );
}

function Insight({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: string;
}) {
  return (
    <div style={insightStyle}>
      <div style={{ color: CB.gold, marginTop: 2 }}>{icon}</div>
      <div>
        <p style={insightLabel}>{label}</p>
        <p style={insightBody}>{children}</p>
      </div>
    </div>
  );
}

const headerGrid: CSSProperties = {
  display: "flex",
  gap: 20,
  alignItems: "flex-start",
};

const titleReady: CSSProperties = {
  margin: "0 0 8px",
  fontFamily: fontSerif,
  fontSize: "clamp(26px, 3vw, 34px)",
  fontWeight: 600,
  color: CB.success,
  lineHeight: 1.05,
};

const titleIncomplete: CSSProperties = {
  ...titleReady,
  color: CB.gold,
};

const descStyle: CSSProperties = {
  margin: "0 0 20px",
  fontSize: 14,
  lineHeight: 1.55,
  color: "rgba(246,245,241,0.92)",
  fontFamily: fontSans,
};

const rows: CSSProperties = {
  display: "grid",
  gap: 14,
};

const insightStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "24px 1fr",
  gap: 12,
  padding: "14px 16px",
  borderRadius: CB.radiusMd,
  border: `1px solid rgba(255,204,106,0.22)`,
  background: "rgba(4,22,14,0.45)",
  fontFamily: fontSans,
};

const insightLabel: CSSProperties = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: CB.gold,
};

const insightBody: CSSProperties = {
  margin: "5px 0 0",
  fontSize: 13,
  lineHeight: 1.45,
  color: CB.white,
};

const laurel: CSSProperties = {
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
  paddingTop: 4,
};
