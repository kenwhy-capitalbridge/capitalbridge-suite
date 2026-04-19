"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChromeSpinnerGlyph } from "@cb/ui";

export type PlatformHeaderBackButtonProps = {
  /** When `history.length` is 1 (e.g. direct open), navigate here instead of `router.back()`. */
  fallbackHref: string;
  /**
   * When set, always `router.push` here (skips `history.back()`). Use on `/settings` to always return to
   * platform home and avoid loops (e.g. SETTINGS → external plans → Back).
   */
  pushHref?: string;
  /** Accessible name; defaults to `"Back"`. */
  ariaLabel?: string;
};

/**
 * Sticky-bar BACK control — same gold chrome as header LOGOUT (`pf-chrome-gold-btn--header-inline`).
 */
export function PlatformHeaderBackButton({
  fallbackHref,
  pushHref,
  ariaLabel = "Back",
}: PlatformHeaderBackButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      aria-busy={isPending}
      aria-label={ariaLabel}
      className="pf-chrome-gold-btn pf-chrome-gold-btn--header-inline platform-header-back-btn"
      style={{
        cursor: isPending ? "wait" : "pointer",
        opacity: isPending ? 0.88 : 1,
        flexShrink: 0,
        ...(isPending
          ? {
              minWidth: "3.25rem",
              justifyContent: "center",
            }
          : {}),
      }}
      onClick={() => {
        startTransition(() => {
          if (pushHref) {
            router.push(pushHref);
            return;
          }
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push(fallbackHref);
          }
        });
      }}
    >
      {isPending ? (
        <span className="cb-pending-btn-inner">
          <ChromeSpinnerGlyph sizePx={14} />
          <span className="cb-visually-hidden">BACK</span>
        </span>
      ) : (
        "BACK"
      )}
    </button>
  );
}
