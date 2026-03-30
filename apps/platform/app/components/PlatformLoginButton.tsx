"use client";

import { useCallback, useState } from "react";
import { ChromeSpinnerGlyph } from "@cb/ui";

export function PlatformLoginButton({ href }: { href: string }) {
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
      className="pf-chrome-outline-btn"
      style={{
        justifySelf: "end",
        opacity: pending ? 0.6 : 1,
        pointerEvents: pending ? "none" : "auto",
      }}
    >
      {pending ? (
        <span className="inline-flex items-center gap-1.5">
          <ChromeSpinnerGlyph className="h-3.5 w-3.5" />
          LOGIN…
        </span>
      ) : (
        "LOGIN"
      )}
    </button>
  );
}
