"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
        aria-label="Go back to the previous page"
        className="pf-chrome-gold-btn"
        style={{
          minHeight: 44,
          cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.88 : 1,
        }}
        onClick={() => {
          startTransition(() => {
            router.back();
          });
        }}
      >
        {isPending ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Loader2 size={14} className="pf-header-avatar-spin" aria-hidden />
            Loading…
          </span>
        ) : (
          "BACK"
        )}
      </button>
    </div>
  );
}
