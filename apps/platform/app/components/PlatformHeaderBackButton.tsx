"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChromeSpinnerGlyph } from "@cb/ui";

export type PlatformHeaderBackButtonProps = {
  /** When `history.length` is 1 (e.g. direct open), navigate here instead of `router.back()`. */
  fallbackHref: string;
};

/**
 * Sticky-bar BACK control — same gold chrome as header LOGOUT (`pf-chrome-gold-btn--header-inline`).
 */
export function PlatformHeaderBackButton({ fallbackHref }: PlatformHeaderBackButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      aria-busy={isPending}
      aria-label="Back"
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
