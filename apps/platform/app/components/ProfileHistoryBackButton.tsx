"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChromeSpinnerGlyph } from "@cb/ui";

/** Always return to platform home (avoids history loop: Profile → Plans → Back → Profile). */
export function ProfileHistoryBackButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ margin: "clamp(1.25rem, 3.5vw, 1.75rem) 0 0" }}>
      <button
        type="button"
        disabled={isPending}
        aria-busy={isPending}
        aria-disabled={isPending}
        aria-label="Back to Capital Bridge platform home"
        className="pf-chrome-gold-btn profile-page-back-btn"
        style={{
          cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.88 : 1,
          position: "relative",
          ...(isPending
            ? {
                minWidth: "4.5rem",
                justifyContent: "center",
                alignItems: "center",
              }
            : {}),
        }}
        onClick={() => {
          startTransition(() => {
            router.push("/");
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
    </div>
  );
}
