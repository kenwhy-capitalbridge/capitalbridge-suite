"use client";

import Link from "next/link";
import { PlatformLogoutToMarketing } from "./PlatformLogoutToMarketing";

export function PlatformHeaderAuthCluster({ initials }: { initials: string }) {
  const label = `Account profile (${initials})`;

  return (
    <div
      style={{
        justifySelf: "end",
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
      }}
    >
      <Link
        href="/profile"
        aria-label={label}
        title="Profile"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 9999,
          fontSize: "0.7rem",
          fontWeight: 800,
          letterSpacing: "0.02em",
          color: "rgba(13, 58, 29, 0.95)",
          backgroundColor: "rgba(255, 204, 106, 0.92)",
          border: "1px solid rgba(255, 204, 106, 0.55)",
          textDecoration: "none",
          lineHeight: 1,
        }}
      >
        {initials}
      </Link>
      <PlatformLogoutToMarketing inline />
    </div>
  );
}
