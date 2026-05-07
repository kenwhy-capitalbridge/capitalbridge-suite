"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChromeHeaderSettingsGearSvg, ChromeSpinnerGlyph } from "@cb/ui";

const ICON_BTN =
  "pf-chrome-gold-btn pf-chrome-gold-btn--header-inline pf-chrome-gold-btn--header-icon shrink-0";

/**
 * Settings (gear) in the platform sticky bar — same chrome as model-app headers; client transition to `/settings`.
 */
export function PlatformHeaderSettingsIconLink() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function settingsTarget(): string {
    if (typeof window === "undefined") return "/settings";
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return `/settings?returnTo=${encodeURIComponent(returnTo)}`;
  }

  return (
    <Link
      href="/settings"
      className={ICON_BTN}
      aria-label="SETTINGS — account and membership"
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
          router.push(settingsTarget());
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
          <span className="cb-visually-hidden">Settings</span>
        </span>
      ) : (
        <ChromeHeaderSettingsGearSvg />
      )}
    </Link>
  );
}
