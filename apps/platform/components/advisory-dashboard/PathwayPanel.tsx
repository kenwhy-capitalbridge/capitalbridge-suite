"use client";

import type { CSSProperties } from "react";
import { Flag } from "lucide-react";
import { DashboardPanel } from "./DashboardPanel";
import { CB, fontSans } from "./cbDashboardTokens";

type Props = {
  incomplete: boolean;
  bodyWhenReady: string;
};

export function PathwayPanel({ incomplete, bodyWhenReady }: Props) {
  return (
    <DashboardPanel
      id="pathway"
      title={incomplete ? "Execution Pathway Not Yet Available" : "Execution Pathway Available"}
    >
      <div style={row}>
        <div style={iconBox}>
          <Flag size={18} color={CB.gold} />
        </div>
        <p style={text}>
          {incomplete
            ? "Execution pathways unlock once the required capital models are completed and the system has sufficient decision inputs."
            : bodyWhenReady}
        </p>
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
  fontSize: 14,
  lineHeight: 1.5,
  color: "rgba(246,245,241,0.92)",
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

const text: CSSProperties = { margin: 0 };
