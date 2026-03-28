"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

export function PlatformLoginButton({ href }: { href: string }) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(() => {
    if (pending) return;
    setPending(true);
    window.location.assign(href);
  }, [href, pending]);

  return (
    <>
      <style>{`@keyframes cbSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Loader2 size={14} style={{ animation: "cbSpin 0.8s linear infinite" }} />
            LOGIN…
          </span>
        ) : (
          "LOGIN"
        )}
      </button>
    </>
  );
}
