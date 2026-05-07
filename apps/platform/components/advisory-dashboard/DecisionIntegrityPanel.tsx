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
          <Fingerprint size={18} color={CB.gold} />
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
  gridTemplateColumns: "40px 1fr",
  gap: 12,
  alignItems: "start",
  fontFamily: fontSans,
};

const iconBox: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: `1px solid rgba(255,204,106,0.4)`,
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.15)",
};

const title: CSSProperties = {
  margin: "0 0 6px",
  fontFamily: fontSerif,
  fontSize: 26,
  fontWeight: 600,
  color: CB.white,
  lineHeight: 1.05,
};

const body: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: "rgba(246,245,241,0.9)",
};
