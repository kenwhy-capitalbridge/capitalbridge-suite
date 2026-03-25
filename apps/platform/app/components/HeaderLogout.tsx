"use client";

import { useCallback, useState } from "react";
import { createAppBrowserClient } from "@cb/supabase/browser";
import { LOGIN_APP_URL } from "@cb/shared/urls";

export function HeaderLogout() {
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
      window.location.replace(`${LOGIN_APP_URL}/access`);
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
        padding: "0.45rem 1rem",
        fontSize: "0.8rem",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "rgba(13, 58, 29, 0.95)",
        backgroundColor: "rgba(255, 204, 106, 0.92)",
        border: "1px solid rgba(255, 204, 106, 0.55)",
        borderRadius: 6,
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.75 : 1,
        transition: "opacity 0.15s ease",
      }}
    >
      {pending ? "Signing out…" : "Logout"}
    </button>
  );
}
