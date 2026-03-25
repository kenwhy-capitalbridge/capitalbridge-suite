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
        style={{
          justifySelf: "end",
          padding: "0.35rem 0.75rem",
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255, 204, 106, 0.95)",
          backgroundColor: "transparent",
          border: "1px solid rgba(255, 204, 106, 0.55)",
          borderRadius: 4,
          textDecoration: "none",
          whiteSpace: "nowrap",
          cursor: pending ? "wait" : "pointer",
          opacity: pending ? 0.6 : 1,
          pointerEvents: pending ? "none" : "auto",
          transition: "opacity 0.15s ease",
        }}
      >
        {pending ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Loader2 size={14} style={{ animation: "cbSpin 0.8s linear infinite" }} />
            Login…
          </span>
        ) : (
          "Login"
        )}
      </button>
    </>
  );
}

