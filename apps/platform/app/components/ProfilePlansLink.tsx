"use client";

import { useCallback, useState } from "react";
import { ChromeSpinnerGlyph } from "@cb/ui";

type Props = { href: string };

/** Solid gold CTA; hover → gold border + gold text + glow (LOGOUT-style). Full navigation with in-button loading state. */
export function ProfilePlansLink({ href }: Props) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(() => {
    if (pending) return;
    setPending(true);
    window.location.assign(href);
  }, [href, pending]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      aria-disabled={pending}
      className="cb-settings-plans-link inline-flex min-h-[50px] w-full max-w-full items-center justify-center px-4 py-2.5 text-[clamp(0.7rem,2vw,0.8rem)] font-bold uppercase tracking-[0.08em] transition-all duration-200 sm:w-auto"
    >
      {pending ? (
        <span className="cb-pending-btn-inner">
          <ChromeSpinnerGlyph sizePx={18} />
          <span className="cb-visually-hidden">View Available Plans</span>
        </span>
      ) : (
        "View Available Plans"
      )}
    </button>
  );
}
