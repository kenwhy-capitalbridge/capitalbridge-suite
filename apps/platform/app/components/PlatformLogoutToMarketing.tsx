"use client";

import { useCallback, useState } from "react";
import { createAppBrowserClient } from "@cb/supabase/browser";
import { ChromeSpinnerGlyph } from "@cb/ui";
import { platformPostLogoutUrl } from "@cb/shared/urls";

/**
 * Clears server session state, signs out of Supabase, then sends the user to the
 * platform root with the Framework scroll-to-text fragment (see platformPostLogoutUrl).
 */
export function PlatformLogoutToMarketing({
  inline = false,
}: {
  /** When nested in a flex row (e.g. next to profile avatar), omit grid justifySelf. */
  inline?: boolean;
} = {}) {
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
      className={inline ? "pf-chrome-gold-btn pf-chrome-gold-btn--header-inline" : "pf-chrome-gold-btn"}
      style={{
        ...(inline ? {} : { justifySelf: "end" }),
        ...(inline && pending
          ? {
              height: "auto",
              minHeight: "var(--pf-header-auth-size, 26px)",
              minWidth: "4.25rem",
              justifyContent: "center",
            }
          : {}),
        ...(!inline && pending ? { minWidth: "4.25rem", justifyContent: "center" } : {}),
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.6 : 1,
        pointerEvents: pending ? "none" : "auto",
      }}
    >
      {pending ? (
        <span className="cb-pending-btn-inner">
          <ChromeSpinnerGlyph sizePx={14} />
          <span className="cb-visually-hidden">SIGNING OUT</span>
        </span>
      ) : (
        "LOGOUT"
      )}
    </button>
  );
}
