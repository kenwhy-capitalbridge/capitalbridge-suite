"use client";

import type { CSSProperties, ReactNode } from "react";
import { CB, fontSans, fontSerif } from "./cbDashboardTokens";

type Props = {
  title: string;
  titleRight?: ReactNode;
  children: ReactNode;
  emphasize?: boolean;
  id?: string;
  /** Slightly more padding for primary chart panel */
  major?: boolean;
};

export function DashboardPanel({ title, titleRight, children, emphasize, id, major }: Props) {
  return (
    <section
      id={id}
      style={{
        ...panelStyle,
        padding: major ? "22px 24px 20px" : "18px 20px 16px",
        ...(emphasize ? { borderColor: "rgba(255,204,106,0.55)", boxShadow: `${CB.shadowCard}, 0 0 0 1px rgba(255,204,106,0.12)` } : {}),
      }}
    >
      <div style={headerRow}>
        <h2 style={titleStyle}>{title}</h2>
        {titleRight}
      </div>
      <div style={bodyStyle}>{children}</div>
    </section>
  );
}

const panelStyle: CSSProperties = {
  border: CB.panelBorder,
  borderRadius: CB.radiusLg,
  background: CB.panelSurface,
  boxShadow: CB.shadowCard,
  fontFamily: fontSans,
};

const headerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: fontSerif,
  fontSize: "clamp(22px, 1.9vw, 30px)",
  lineHeight: 1.08,
  fontWeight: 600,
  color: CB.gold,
};

const bodyStyle: CSSProperties = {
  marginTop: 10,
  color: CB.white,
};
