"use client";

import { BRAND_LIONHEAD_GOLD } from "@cb/ui";

const GREEN = "#0D3A1D";

/** Premium background + lion watermark — non-interactive, matches advisory cockpit. */
export function StagingAccessBackdrop() {
  return (
    <div
      style={{
        pointerEvents: "none",
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        backgroundColor: GREEN,
      }}
      aria-hidden
    >
      <div
        style={{
          position: "absolute",
          right: "-8%",
          top: "-12%",
          width: "min(55vmin, 420px)",
          height: "min(55vmin, 420px)",
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 40%, rgba(255,204,106,0.14) 0%, transparent 62%)",
        }}
      />
      <img
        src={BRAND_LIONHEAD_GOLD}
        alt=""
        style={{
          position: "absolute",
          right: "-32px",
          top: "-8px",
          height: "min(42vh, 340px)",
          width: "auto",
          maxWidth: "none",
          opacity: 0.14,
          mixBlendMode: "soft-light",
          filter: "saturate(1.05) contrast(1.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(195deg, rgba(13,58,29,0.25) 0%, ${GREEN} 55%, ${GREEN} 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.07,
          backgroundImage: `repeating-linear-gradient(
            -12deg,
            transparent,
            transparent 40px,
            rgba(255,204,106,0.06) 41px,
            rgba(255,204,106,0.06) 42px
          )`,
        }}
      />
    </div>
  );
}
