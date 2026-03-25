"use client";

import { useCallback, useState } from "react";
import { createAppBrowserClient } from "@cb/supabase/browser";
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
      await fetch("/api/clear-active-session", { method: "POST", credentials: "include" }).catch(
        () => {}
      );
      const supabase = createAppBrowserClient();
      await supabase.auth.signOut();
      window.location.replace(platformPostLogoutUrl());
    } catch {
      setPending(false);
    }
  }, [pending]);

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      aria-busy={pending}
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
        opacity: pending ? 0.75 : 1,
        transition: "opacity 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {pending ? "…" : "Logout"}
    </button>
  );
}
