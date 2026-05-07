"use client";

import type { CSSProperties } from "react";
import { Fingerprint } from "lucide-react";
import { DashboardPanel } from "./DashboardPanel";
import { CB, fontSans, fontSerif } from "./cbDashboardTokens";

type Props = {
  incomplete: boolean;
  agreement: "HIGH" | "MEDIUM" | "LOW";
};

export function DecisionIntegrityPanel({ incomplete, agreement }: Props) {
  return (
    <DashboardPanel title="Decision Integrity">
      <div style={row}>
        <div style={iconBox}>
          <Fingerprint size={16} color={CB.gold} />
        </div>
        <div>
          <p style={title}>
            {incomplete ? "Pending" : agreement === "HIGH" ? "High Agreement" : agreement === "MEDIUM" ? "Medium Agreement" : "Low Agreement"}
          </p>
          <p style={body}>
            {incomplete
              ? "Confidence is calculated once the required model outputs are available."
              : agreement === "HIGH"
                ? "Completed models are aligned with high confidence. Strong basis for execution decisions."
                : agreement === "MEDIUM"
                  ? "Models show partial alignment. Review underlying signals before proceeding."
                  : "Models are not aligned. Execution should be reviewed before action."}
          </p>
        </div>
      </div>
    </DashboardPanel>
  );
}

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "34px 1fr",
  gap: 10,
  alignItems: "start",
  fontFamily: fontSans,
};

const iconBox: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: `1px solid rgba(255,204,106,0.42)`,
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.18)",
};

const title: CSSProperties = {
  margin: "0 0 5px",
  fontFamily: fontSerif,
  fontSize: "clamp(20px, 1.8vw, 24px)",
  fontWeight: 600,
  color: CB.white,
  lineHeight: 1.08,
};

const body: CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.4,
  color: "rgba(246,245,241,0.88)",
};
