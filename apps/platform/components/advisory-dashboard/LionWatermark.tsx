"use client";

import { BRAND_LIONHEAD_GOLD } from "@cb/ui";
import { CB } from "./cbDashboardTokens";

/** Premium sculptural lion — upper-right, non-interactive, does not block text. */
export function LionWatermark() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "min(42vw, 380px)",
        height: "min(48vh, 420px)",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-6%",
          top: "-4%",
          width: "110%",
          height: "110%",
          background: `radial-gradient(ellipse at 70% 30%, rgba(255,204,106,0.12) 0%, transparent 55%)`,
        }}
      />
      <img
        src={BRAND_LIONHEAD_GOLD}
        alt=""
        style={{
          position: "absolute",
          right: "-40px",
          top: "-20px",
          width: "auto",
          height: "108%",
          maxWidth: "none",
          opacity: 0.22,
          mixBlendMode: "soft-light",
          filter: "saturate(1.05) contrast(1.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(210deg, transparent 40%, ${CB.green} 92%)`,
        }}
      />
    </div>
  );
}
