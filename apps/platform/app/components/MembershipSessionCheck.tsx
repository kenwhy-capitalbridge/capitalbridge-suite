"use client";

import { useEffect, useRef } from "react";
import { createAppBrowserClient, isSupabaseConfigured } from "@cb/supabase/browser";
import { LOGIN_APP_URL } from "@cb/shared/urls";

/**
 * If the server allowed an older session but membership/profile are now invalid,
 * sign out and send the user to the login app with context.
 */
export function MembershipSessionCheck() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;

    async function run() {
      try {
        const supabase = createAppBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const res = await fetch("/api/check-membership", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as { valid?: boolean };
        if (cancelled || data.valid !== false) return;

        await supabase.auth.signOut();

        const u = new URL(`${LOGIN_APP_URL}/access`);
        u.searchParams.set("membership_inactive", "1");
        window.location.replace(u.toString());
      } catch {
        /* ignore */
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
