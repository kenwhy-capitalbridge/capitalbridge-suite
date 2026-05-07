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
          <Flag size={16} color={CB.gold} />
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
  gridTemplateColumns: "34px 1fr",
  gap: 10,
  alignItems: "start",
  fontFamily: fontSans,
  fontSize: 13,
  lineHeight: 1.42,
  color: "rgba(246,245,241,0.9)",
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

const text: CSSProperties = { margin: 0 };
