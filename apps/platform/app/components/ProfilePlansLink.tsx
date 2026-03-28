"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = { href: string };

/** Gold outline CTA; hover → green (#0D3A1D) + cream text (#F6F5F1). Full navigation with in-button loading state. */
export function ProfilePlansLink({ href }: Props) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(() => {
    if (pending) return;
    setPending(true);
    window.location.assign(href);
  }, [href, pending]);

  return (
    <>
      <style>{`@keyframes cbPfSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-busy={pending}
        aria-disabled={pending}
        className="cb-profile-plans-link inline-flex min-h-[44px] w-full max-w-full items-center justify-center px-4 py-2.5 text-[clamp(0.7rem,2vw,0.8rem)] font-bold uppercase tracking-[0.08em] transition-colors duration-150 sm:w-auto"
      >
        {pending ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Loader2
              size={18}
              strokeWidth={2.25}
              aria-hidden
              style={{ animation: "cbPfSpin 0.8s linear infinite" }}
            />
            Loading…
          </span>
        ) : (
          "View Available Plans"
        )}
      </button>
    </>
  );
}
