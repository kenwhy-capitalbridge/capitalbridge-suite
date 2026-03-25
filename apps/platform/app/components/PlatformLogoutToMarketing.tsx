"use client";

import { useCallback, useState } from "react";
import { createAppBrowserClient } from "@cb/supabase/browser";
import { MARKETING_SITE_URL } from "@cb/shared/urls";

function marketingHomeUrl(): string {
  const base = MARKETING_SITE_URL.replace(/\/+$/, "");
  return `${base}/`;
}

/**
 * Ends the platform session and sends the user to the main marketing site
 * (same-tab; see NEXT_PUBLIC_MARKETING_SITE_URL).
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
      window.location.replace(marketingHomeUrl());
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
