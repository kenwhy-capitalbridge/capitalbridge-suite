"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase, recoverySupabase } from "@/lib/supabaseClient";

const PLATFORM_URL =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLATFORM_APP_URL : undefined) ??
  "https://platform.thecapitalbridge.com";

type View = "loading" | "set_password" | "login" | "error" | "success";

function PlatformAccessNotice({
  membershipInactive,
  sessionCleared,
}: {
  membershipInactive: boolean;
  sessionCleared: boolean;
}) {
  if (!membershipInactive && !sessionCleared) return null;

  return (
    <div className="w-full border-b border-cb-gold/40 bg-amber-50 px-4 py-3 text-center text-cb-green">
      <p className="text-sm font-semibold">
        {sessionCleared
          ? "Your session expired. Please sign in again."
          : "Your access is no longer active."}
      </p>
    </div>
  );
}

function AccessInner() {
  const searchParams = useSearchParams();

  const membershipInactive = useMemo(
    () => searchParams.get("membership_inactive") === "1",
    [searchParams]
  );

  const sessionCleared = useMemo(
    () => searchParams.get("session_cleared") === "1",
    [searchParams]
  );

  const [view, setView] = useState<View>("loading");
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [email, setEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const [busy, setBusy] = useState(false);

  const destination = useMemo(() => {
    return `${PLATFORM_URL.replace(/\/$/, "")}/`;
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(window.location.search);

        // -------------------------------
        // 1. RECOVERY TOKEN (ABSOLUTE PRIORITY)
        // -------------------------------
        if (hash && hash.includes("access_token")) {
          const hp = new URLSearchParams(hash.replace(/^#/, ""));
          const access = hp.get("access_token");
          const refresh = hp.get("refresh_token");

          if (access && refresh) {
            const { error } = await recoverySupabase.auth.setSession({
              access_token: access,
              refresh_token: refresh,
            });

            if (error) throw error;

            window.history.replaceState(null, "", window.location.pathname);
            setView("set_password");
            return;
          }

          throw new Error("Invalid or expired link");
        }

        // -------------------------------
        // 2. PKCE CODE
        // -------------------------------
        const code = params.get("code");
        if (code) {
          const { error } = await recoverySupabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          window.history.replaceState(null, "", window.location.pathname);
          setView("set_password");
          return;
        }

        // -------------------------------
        // 3. EXISTING SESSION
        // -------------------------------
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          window.location.replace(destination);
          return;
        }

        // -------------------------------
        // 4. DEFAULT → LOGIN
        // -------------------------------
        setView("login");
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong");
        setView("error");
      }
    };

    void init();
  }, [destination]);

  useEffect(() => {
    if (view !== "success") return;
    const t = window.setTimeout(() => {
      window.location.href = destination;
    }, 2500);
    return () => window.clearTimeout(t);
  }, [view, destination]);

  // -------------------------------
  // SET PASSWORD
  // -------------------------------
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPw) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);

    const { error: updateErr } = await recoverySupabase.auth.updateUser({
      password,
    });

    setBusy(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setView("success");
  }

  // -------------------------------
  // LOGIN
  // -------------------------------
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setError(null);

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: loginPw,
    });

    setBusy(false);

    if (signErr) {
      setError(
        "Check your email and password, or activate your account from your email."
      );
      return;
    }

    window.location.href = destination;
  }

  // -------------------------------
  // UI
  // -------------------------------

  if (view === "loading") {
    return (
      <>
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
        />
        <main className="flex min-h-screen items-center justify-center bg-cb-green">
          <p className="text-white">Loading...</p>
        </main>
      </>
    );
  }

  if (view === "success") {
    return (
      <>
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
        />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md w-full text-center">
            <p className="text-cb-green">
              You&apos;re all set. Taking you to your dashboard…
            </p>
          </div>
        </main>
      </>
    );
  }

  if (view === "set_password") {
    const passwordSubmitDisabled =
      busy || password.length < 6 || password !== confirmPw;

    return (
      <>
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
        />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md w-full">
            <h1 className="cb-card-title text-center">Set your password</h1>
            <p className="cb-card-subtitle mt-2 text-center">
              You&apos;re one step away from accessing your account.
            </p>

            {error && <p className="cb-message-error mt-4">{error}</p>}

            <form onSubmit={handleSetPassword} className="mt-6 flex flex-col gap-4">
              <input
                className="cb-input"
                type="password"
                placeholder="Password"
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <input
                className="cb-input"
                type="password"
                placeholder="Confirm password"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />

              <button
                className="cb-btn-primary"
                type="submit"
                disabled={passwordSubmitDisabled}
              >
                {busy ? "Securing your account…" : "Continue to dashboard"}
              </button>
            </form>
          </div>
        </main>
      </>
    );
  }

  if (view === "login") {
    const loginDisabled = busy || !email.trim() || !loginPw;

    return (
      <>
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
        />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md w-full">
            <h1 className="cb-card-title text-center">Welcome back</h1>
            <p className="cb-card-subtitle mt-2 text-center">
              Sign in with your email and password.
            </p>

            {error && <p className="cb-message-error mt-4">{error}</p>}

            <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
              <input
                className="cb-input"
                type="email"
                placeholder="Email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="cb-input"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
              />

              <p className="text-sm text-cb-green/80">
                Don&apos;t have a password yet? Check your email to activate your account.
              </p>

              <button
                className="cb-btn-primary"
                type="submit"
                disabled={loginDisabled}
              >
                {busy ? "Signing you in…" : "Access dashboard"}
              </button>
            </form>
          </div>
        </main>
      </>
    );
  }

  if (view === "error") {
    return (
      <>
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
        />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md text-center">
            <h1 className="cb-card-title">This link has expired</h1>
            <p className="mt-2 text-sm text-cb-green/90">
              Your access link is no longer valid. Request a new one to continue.
            </p>

            <button
              type="button"
              className="cb-btn-primary mt-6"
              onClick={() => {
                setError(null);
                setView("login");
              }}
            >
              Back to login
            </button>
          </div>
        </main>
      </>
    );
  }

  return null;
}

export default function AccessPage() {
  return (
    <Suspense fallback={<div />}>
      <AccessInner />
    </Suspense>
  );
}
