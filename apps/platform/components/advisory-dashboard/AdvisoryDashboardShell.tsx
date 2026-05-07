"use client";

import type { CSSProperties, ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { LionWatermark } from "./LionWatermark";
import { CB, fontSans, fontSerif } from "./cbDashboardTokens";

type Props = {
  /** Eyebrow + hero + status banner only — header is PlatformFrameworkHeader above. */
  eyebrow: string;
  title: string;
  subtitle: string;
  statusComplete: boolean;
  statusLineIncomplete: string;
  statusLineComplete: string;
  children: ReactNode;
};

export function AdvisoryDashboardShell({
  eyebrow,
  title,
  subtitle,
  statusComplete,
  statusLineIncomplete,
  statusLineComplete,
  children,
}: Props) {
  return (
    <div style={page}>
      <LionWatermark />
      <div style={contentWrap}>
        <header style={hero}>
          <p style={eyebrowStyle}>{eyebrow}</p>
          <h1 style={heroTitle}>{title}</h1>
          <p style={heroSub}>{subtitle}</p>
          <div style={banner}>
            <CheckCircle2 size={18} color={statusComplete ? CB.success : CB.gold} style={{ flexShrink: 0 }} />
            <p style={bannerText}>{statusComplete ? statusLineComplete : statusLineIncomplete}</p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

const page: CSSProperties = {
  position: "relative",
  flex: 1,
  width: "100%",
  minHeight: 0,
  backgroundColor: CB.green,
  overflow: "hidden",
};

/** Compact hero + tight coupling to module rail / KPI strip */
const contentWrap: CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: 1440,
  margin: "0 auto",
  padding: "clamp(40px, 5vw, 56px) clamp(16px, 3vw, 32px) 6px",
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const hero: CSSProperties = {
  position: "relative",
  zIndex: 1,
  padding: "0 0 clamp(24px, 3vw, 32px)",
  maxWidth: "min(880px, 100%)",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontFamily: fontSans,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: CB.gold,
};

const heroTitle: CSSProperties = {
  margin: "6px 0 8px",
  fontFamily: fontSerif,
  fontSize: "clamp(44px, 5.2vw, 72px)",
  lineHeight: 1.02,
  fontWeight: 600,
  color: CB.white,
};

const heroSub: CSSProperties = {
  margin: 0,
  fontFamily: fontSans,
  fontSize: "clamp(14px, 1.35vw, 15px)",
  lineHeight: 1.45,
  color: "rgba(246,245,241,0.9)",
  maxWidth: 760,
};

const banner: CSSProperties = {
  marginTop: 12,
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "11px 14px",
  borderRadius: CB.radiusMd,
  border: `1px solid rgba(255,204,106,0.38)`,
  background: "rgba(5,28,16,0.72)",
  maxWidth: 820,
};

const bannerText: CSSProperties = {
  margin: 0,
  fontFamily: fontSans,
  fontSize: 13,
  lineHeight: 1.42,
  color: CB.white,
};
