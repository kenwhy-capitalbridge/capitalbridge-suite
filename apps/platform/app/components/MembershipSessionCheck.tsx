"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createAppBrowserClient, isSupabaseConfigured } from "@cb/supabase/browser";
import { LOGIN_APP_URL } from "@cb/shared/urls";

const MEMBERSHIP_POLL_MS = 15_000;
const MEMBERSHIP_ERROR_GRACE_MS = 10 * 60 * 1000;
const STILL_CHECKING_AFTER_MS = 25_000;

const COPY_SYNCING_ACCESS = "We're syncing your access…";
const COPY_VERIFYING_ACCESS = "Verifying your access…";
const COPY_STILL_CHECKING = "Still checking. This may take a moment.";
const COPY_TRY_AGAIN_NOW = "Try Again Now";
const COPY_YOURE_ALL_SET = "You're all set";
const COPY_STILL_SYNCING_BEFORE_LOGOUT = "Still syncing your access…";

type BannerState = null | { variant: "syncing" } | { variant: "verify"; line: string };

export type MembershipSessionCheckProps = {
  /** Set from server when `cb_mbr_safe` is active for the current user (safe mode). */
  initialSafeMode?: boolean;
};

/**
 * Membership check with plain-English status while retrying transient errors.
 */
export function MembershipSessionCheck({ initialSafeMode = false }: MembershipSessionCheckProps) {
  const ranRef = useRef(false);
  const [banner, setBanner] = useState<BannerState>(() => (initialSafeMode ? { variant: "syncing" } : null));
  const runOnceRef = useRef<(() => Promise<void>) | null>(null);
  const clearPollRef = useRef<(() => void) | null>(null);
  const pollIdRef = useRef<number | null>(null);
  const stillTimerRef = useRef<number | null>(null);
  const runInFlightRef = useRef(false);
  const manualRetryRef = useRef(false);
  const [welcomeBanner, setWelcomeBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let hideT: number | undefined;

    const go = () => {
      if (cancelled || typeof document === "undefined" || document.readyState !== "complete") return;
      const u = new URL(window.location.href);
      if (u.searchParams.get("cb_all_set") !== "1") return;
      setWelcomeBanner(true);
      u.searchParams.delete("cb_all_set");
      const qs = u.searchParams.toString();
      window.history.replaceState({}, "", `${u.pathname}${qs ? `?${qs}` : ""}${u.hash}`);
      hideT = window.setTimeout(() => setWelcomeBanner(false), 5000) as unknown as number;
    };

    if (document.readyState === "complete") {
      go();
    } else {
      window.addEventListener("load", go, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", go);
      if (hideT) window.clearTimeout(hideT);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;
    const started = Date.now();

    const clearPoll = () => {
      if (pollIdRef.current != null) {
        clearInterval(pollIdRef.current);
        pollIdRef.current = null;
      }
    };

    const clearStillTimer = () => {
      if (stillTimerRef.current != null) {
        window.clearTimeout(stillTimerRef.current);
        stillTimerRef.current = null;
      }
    };

    clearPollRef.current = clearPoll;

    async function signOutToLogin(reason: "inactive" | "error_timeout") {
      try {
        if (reason === "error_timeout") {
          setBanner({ variant: "verify", line: COPY_STILL_SYNCING_BEFORE_LOGOUT });
          await new Promise((r) => window.setTimeout(r, 1200));
        }
        const supabase = createAppBrowserClient();
        await fetch("/api/clear-active-session", { method: "POST", credentials: "include" }).catch(() => {});
        await supabase.auth.signOut();
        const u = new URL(`${LOGIN_APP_URL}/access`);
        u.searchParams.set("membership_inactive", "1");
        if (reason === "error_timeout") {
          u.searchParams.set("membership_verify_failed", "1");
        }
        window.location.replace(u.toString());
      } catch {
        /* ignore */
      }
    }

    const startPoll = () => {
      clearPoll();
      pollIdRef.current = window.setInterval(() => {
        if (manualRetryRef.current) return;
        void runOnceRef.current?.();
      }, MEMBERSHIP_POLL_MS) as unknown as number;
    };

    const runOnce = async (): Promise<void> => {
      if (runInFlightRef.current) return;
      runInFlightRef.current = true;
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
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean;
          reason?: "inactive" | "error" | "unauthenticated";
        };

        if (cancelled) return;

        if (data.valid === true) {
          setBanner(null);
          clearStillTimer();
          clearPoll();
          return;
        }

        if (data.valid === false && data.reason == null) {
          await signOutToLogin("inactive");
          return;
        }

        if (data.reason === "inactive" || data.reason === "unauthenticated") {
          await signOutToLogin("inactive");
          return;
        }

        if (data.reason === "error") {
          if (Date.now() - started > MEMBERSHIP_ERROR_GRACE_MS) {
            await signOutToLogin("error_timeout");
            return;
          }
          if (stillTimerRef.current == null) {
            stillTimerRef.current = window.setTimeout(() => {
              if (!cancelled) setBanner({ variant: "verify", line: COPY_STILL_CHECKING });
            }, STILL_CHECKING_AFTER_MS);
            setBanner({ variant: "verify", line: COPY_VERIFYING_ACCESS });
          }
          if (pollIdRef.current == null) {
            startPoll();
          }
        }
      } catch {
        if (cancelled) return;
        if (Date.now() - started > MEMBERSHIP_ERROR_GRACE_MS) {
          await signOutToLogin("error_timeout");
          return;
        }
        if (stillTimerRef.current == null) {
          stillTimerRef.current = window.setTimeout(() => {
            if (!cancelled) setBanner({ variant: "verify", line: COPY_STILL_CHECKING });
          }, STILL_CHECKING_AFTER_MS);
          setBanner({ variant: "verify", line: COPY_VERIFYING_ACCESS });
        }
        if (pollIdRef.current == null) {
          startPoll();
        }
      } finally {
        runInFlightRef.current = false;
      }
    };

    runOnceRef.current = runOnce;
    void runOnce();

    return () => {
      cancelled = true;
      clearPoll();
      clearStillTimer();
    };
  }, []);

  const onRetry = useCallback(() => {
    if (runInFlightRef.current) return;
    manualRetryRef.current = true;
    clearPollRef.current?.();
    void (async () => {
      try {
        await runOnceRef.current?.();
      } finally {
        manualRetryRef.current = false;
      }
    })();
  }, []);

  if (!welcomeBanner && !banner) return null;

  const welcomeClass =
    "fixed inset-x-0 top-0 z-[101] border-b border-cb-gold/35 bg-white/95 px-3 py-2 text-center text-xs font-medium text-cb-green shadow-md sm:text-sm";

  const shellSyncingClass =
    "fixed inset-x-0 z-[100] border-b-2 border-amber-600/35 bg-amber-100 px-3 py-3 text-center text-sm text-cb-green shadow-md sm:px-4 sm:py-3.5";

  const shellVerifyClass =
    "fixed inset-x-0 z-[100] border-b-2 border-sky-700/35 bg-sky-50 px-3 py-3 text-center text-sm text-cb-green shadow-md sm:px-4 sm:py-3.5";

  const membershipTop = welcomeBanner ? "top-12 sm:top-14" : "top-0";

  const showSpinner =
    banner?.variant === "verify" &&
    banner.line !== COPY_STILL_SYNCING_BEFORE_LOGOUT;

  return (
    <>
      {welcomeBanner ? (
        <div className={welcomeClass} role="status">
          {COPY_YOURE_ALL_SET}
        </div>
      ) : null}

      {banner?.variant === "syncing" ? (
        <div className={`${shellSyncingClass} ${membershipTop}`} role="status">
          <p className="text-base font-semibold tracking-tight">{COPY_SYNCING_ACCESS}</p>
        </div>
      ) : null}

      {banner?.variant === "verify" ? (
        <div className={`${shellVerifyClass} ${membershipTop}`} role="status">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <span className="inline-flex items-center gap-2.5">
              {showSpinner ? (
                <span
                  className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cb-green/25 border-t-cb-green"
                  aria-hidden
                />
              ) : null}
              <span className="font-semibold">{banner.line}</span>
            </span>
            {banner.line !== COPY_STILL_SYNCING_BEFORE_LOGOUT ? (
              <button
                type="button"
                className="text-xs font-bold underline decoration-cb-gold/60 underline-offset-2 sm:text-sm"
                onClick={onRetry}
              >
                {COPY_TRY_AGAIN_NOW}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
