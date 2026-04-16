"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChromeSpinnerGlyph } from "@cb/ui";
import { PlatformLogoutToMarketing } from "./PlatformLogoutToMarketing";

export function PlatformHeaderAuthCluster() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
        flexShrink: 0,
      }}
    >
      <Link
        href="/profile"
        className="pf-chrome-gold-btn pf-chrome-gold-btn--header-inline"
        aria-label="Settings — account and profile"
        title="Settings"
        aria-busy={isPending}
        aria-disabled={isPending}
        tabIndex={isPending ? -1 : undefined}
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
          pointerEvents: isPending ? "none" : undefined,
          opacity: isPending ? 0.92 : 1,
        }}
      >
        {isPending ? (
          <span className="cb-pending-btn-inner">
            <ChromeSpinnerGlyph sizePx={12} />
            <span className="cb-visually-hidden">Loading</span>
          </span>
        ) : (
          "SETTINGS"
        )}
      </Link>
      <PlatformLogoutToMarketing inline />
    </div>
  );
}
