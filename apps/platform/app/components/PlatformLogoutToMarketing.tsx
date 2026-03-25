"use client";

import { useCallback, useState } from "react";
import { createAppBrowserClient } from "@cb/supabase/browser";
import { Loader2 } from "lucide-react";
import { platformPostLogoutUrl } from "@cb/shared/urls";

/**
 * Clears server session state, signs out of Supabase, then sends the user to the
 * platform root with the Framework scroll-to-text fragment (see platformPostLogoutUrl).
 */
export function PlatformLogoutToMarketing() {
  const [pending, setPending] = useState(false);

  const onLogout = useCallback(async () => {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/clear-active-session", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});

      const supabase = createAppBrowserClient();
      const target = platformPostLogoutUrl();
      const [prefix, hash = ""] = target.split("#");
      // Force a real navigation even if you're already on the same `#:~:text=` URL
      // (hash changes alone may not re-render server components).
      const finalTarget = `${prefix}?logout=1${hash ? `#${hash}` : ""}`;

      const timeoutMs = 8000;
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));

      try {
        await Promise.race([supabase.auth.signOut(), timeoutPromise]);
      } catch (e) {
        // If signOut fails (missing env/network), we still redirect so the user exits the platform.
        console.warn("[platform] signOut failed; redirecting anyway:", e);
      }

      window.location.replace(finalTarget);
    } finally {
      // If redirect didn't happen for some reason, ensure the UI recovers.
      setPending(false);
    }
  }, [pending]);

  return (
    <button
      type="button"
      onClick={onLogout}
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
        color: "rgba(13, 58, 29, 0.95)",
        backgroundColor: "rgba(255, 204, 106, 0.92)",
        border: "1px solid rgba(255, 204, 106, 0.55)",
        borderRadius: 4,
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.6 : 1,
        transition: "opacity 0.15s ease",
        pointerEvents: pending ? "none" : "auto",
        whiteSpace: "nowrap",
      }}
    >
      <style>{`@keyframes cbSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      {pending ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Loader2 size={14} style={{ animation: "cbSpin 0.8s linear infinite" }} />
          Signing out…
        </span>
      ) : (
        "Logout"
      )}
    </button>
  );
}
