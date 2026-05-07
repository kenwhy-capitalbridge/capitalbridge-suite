"use client";

import { PlatformLogoutToMarketing } from "./PlatformLogoutToMarketing";

export function PlatformHeaderAuthCluster() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
        flexShrink: 0,
      }}
    >
      <PlatformLogoutToMarketing inline />
    </div>
  );
}
