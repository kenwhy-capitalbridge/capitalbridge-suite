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
        ...(pending ? { minWidth: "3.5rem", justifyContent: "center" } : {}),
      }}
    >
      {pending ? (
        <>
          <ChromeSpinnerGlyph sizePx={14} />
          <span className="cb-visually-hidden">LOGIN</span>
        </>
      ) : (
        "LOGIN"
      )}
    </button>
  );
}
