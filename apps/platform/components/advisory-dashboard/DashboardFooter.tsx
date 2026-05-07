"use client";

import type { CSSProperties } from "react";
import { CB, fontSans } from "./cbDashboardTokens";

export function DashboardFooter() {
  return (
    <footer style={foot}>
      <div style={inner}>
        <p style={left}>
          © {new Date().getFullYear()} Capital Bridge. All rights reserved. Capital Bridge™ and associated marks are
          proprietary. Advisory outputs are confidential.
        </p>
        <p style={right}>Private & Confidential</p>
      </div>
    </footer>
  );
}

const foot: CSSProperties = {
  borderTop: `1px solid rgba(255,204,106,0.25)`,
  marginTop: "auto",
  padding: "20px 24px 28px",
  background: "rgba(8,32,22,0.92)",
  fontFamily: fontSans,
};

const inner: CSSProperties = {
  maxWidth: 1440,
  margin: "0 auto",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
};

const left: CSSProperties = {
  margin: 0,
  fontSize: 11,
  lineHeight: 1.55,
  color: "rgba(246,245,241,0.55)",
  maxWidth: 720,
};

const right: CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: CB.gold,
};
