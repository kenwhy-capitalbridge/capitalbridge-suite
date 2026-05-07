"use client";

import { BRAND_LIONHEAD_GOLD } from "@cb/ui";
import { CB } from "./cbDashboardTokens";

/** Premium sculptural lion — upper-right, integrated into cockpit background. */
export function LionWatermark() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "min(40vw, 360px)",
        height: "min(42vh, 380px)",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-4%",
          top: "-2%",
          width: "108%",
          height: "108%",
          background: `radial-gradient(ellipse at 72% 28%, rgba(255,204,106,0.14) 0%, transparent 52%)`,
        }}
      />
      <img
        src={BRAND_LIONHEAD_GOLD}
        alt=""
        style={{
          position: "absolute",
          right: "-36px",
          top: "-16px",
          width: "auto",
          height: "105%",
          maxWidth: "none",
          opacity: 0.21,
          mixBlendMode: "soft-light",
          filter: "saturate(1.08) contrast(1.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(205deg, transparent 38%, ${CB.green} 90%)`,
        }}
      />
    </div>
  );
}
