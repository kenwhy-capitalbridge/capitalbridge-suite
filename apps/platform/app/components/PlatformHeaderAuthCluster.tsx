"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { PlatformLogoutToMarketing } from "./PlatformLogoutToMarketing";

export function PlatformHeaderAuthCluster({ initials }: { initials: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
        aria-busy={isPending}
        onClick={(e) => {
          if (e.defaultPrevented) return;
          if (e.button !== 0) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          startTransition(() => {
            router.push("/profile");
          });
        }}
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
          pointerEvents: isPending ? "none" : undefined,
          opacity: isPending ? 0.92 : 1,
        }}
      >
        {isPending ? (
          <Loader2
            className="pf-header-avatar-spin"
            size={16}
            strokeWidth={2.5}
            aria-hidden
          />
        ) : (
          initials
        )}
      </Link>
      <PlatformLogoutToMarketing inline />
    </div>
  );
}
