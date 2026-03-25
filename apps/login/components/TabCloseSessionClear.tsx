"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { shouldSuppressTabSignOut } from "@/lib/suppressTabSignOutNav";

/**
 * On tab/window close (not bfcache), clear the session so cookies do not linger.
 * Skipped briefly after {@link suppressTabSignOutForAuthNavigation} (e.g. redirect to platform).
 */
export function TabCloseSessionClear() {
  useEffect(() => {
    const onPageHide = (e: PageTransitionEvent) => {
      if (e.persisted) return;
      if (shouldSuppressTabSignOut()) return;
      try {
        const origin = window.location.origin;
        void fetch(`${origin}/api/auth/sign-out`, {
          method: "POST",
          credentials: "include",
          keepalive: true,
        });
      } catch {
        /* ignore */
      }
      void supabase.auth.signOut();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  return null;
}
