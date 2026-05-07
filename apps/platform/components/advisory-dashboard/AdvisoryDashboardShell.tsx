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
            <CheckCircle2 size={22} color={statusComplete ? CB.success : CB.gold} style={{ flexShrink: 0 }} />
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

const contentWrap: CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: 1440,
  margin: "0 auto",
  padding: "20px clamp(16px, 3vw, 32px) 8px",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const hero: CSSProperties = {
  position: "relative",
  zIndex: 1,
  padding: "8px 0 4px",
  maxWidth: "min(920px, 100%)",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontFamily: fontSans,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: CB.gold,
};

const heroTitle: CSSProperties = {
  margin: "10px 0 12px",
  fontFamily: fontSerif,
  fontSize: "clamp(48px, 6vw, 78px)",
  lineHeight: 1.02,
  fontWeight: 600,
  color: CB.white,
};

const heroSub: CSSProperties = {
  margin: 0,
  fontFamily: fontSans,
  fontSize: "clamp(15px, 1.5vw, 17px)",
  lineHeight: 1.45,
  color: "rgba(246,245,241,0.9)",
  maxWidth: 820,
};

const banner: CSSProperties = {
  marginTop: 18,
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "14px 16px",
  borderRadius: CB.radiusMd,
  border: `1px solid rgba(255,204,106,0.35)`,
  background: "rgba(13,58,29,0.55)",
  maxWidth: 900,
};

const bannerText: CSSProperties = {
  margin: 0,
  fontFamily: fontSans,
  fontSize: 14,
  lineHeight: 1.45,
  color: CB.white,
};
