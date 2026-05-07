"use client";

import type { CSSProperties, ReactNode } from "react";
import { CB, fontSans, fontSerif } from "./cbDashboardTokens";

type Props = {
  title: string;
  titleRight?: ReactNode;
  children: ReactNode;
  emphasize?: boolean;
  id?: string;
};

export function DashboardPanel({ title, titleRight, children, emphasize, id }: Props) {
  return (
    <section
      id={id}
      style={{
        ...panelStyle,
        ...(emphasize ? { borderColor: "rgba(255,204,106,0.62)" } : {}),
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
  border: CB.cardBorder,
  borderRadius: CB.radiusLg,
  background: CB.cardBg,
  boxShadow: CB.shadowCard,
  padding: "22px 24px",
  fontFamily: fontSans,
};

const headerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: fontSerif,
  fontSize: "clamp(22px, 2.2vw, 30px)",
  lineHeight: 1.12,
  fontWeight: 600,
  color: CB.gold,
};

const bodyStyle: CSSProperties = {
  marginTop: 14,
  color: CB.white,
};
