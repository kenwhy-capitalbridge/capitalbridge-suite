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
  borderTop: `1px solid rgba(255,204,106,0.22)`,
  marginTop: "auto",
  padding: "12px 20px 14px",
  background: "rgba(6,28,18,0.96)",
  fontFamily: fontSans,
};

const inner: CSSProperties = {
  maxWidth: 1440,
  margin: "0 auto",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

const left: CSSProperties = {
  margin: 0,
  fontSize: 10,
  lineHeight: 1.45,
  color: "rgba(246,245,241,0.52)",
  maxWidth: "min(680px, 100%)",
};

const right: CSSProperties = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: CB.gold,
};
