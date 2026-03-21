"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getEmailAccessState } from "@cb/advisory-graph/auth/emailAccessState";
import { supabase, recoverySupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getAccessRedirectUrlForAuthEmails } from "@/lib/authEmailRedirect";

const PLATFORM_URL =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLATFORM_APP_URL : undefined) ??
  "https://platform.thecapitalbridge.com";

const RESEND_COOLDOWN_SEC = 45;

type AccessScreen =
  | { kind: "loading" }
  | { kind: "set_password" }
  | { kind: "set_password_success" }
  | { kind: "link_error" }
  | { kind: "email" }
  | { kind: "no_account"; email: string }
  | { kind: "needs_activation"; email: string }
  | { kind: "sign_in"; email: string };

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

  const [screen, setScreen] = useState<AccessScreen>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const [busy, setBusy] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  const destination = useMemo(() => `${PLATFORM_URL.replace(/\/$/, "")}/`, []);
  const authEmailRedirect = useMemo(() => getAccessRedirectUrlForAuthEmails(), []);

  useEffect(() => {
    if (resendSecondsLeft <= 0) return;
    const t = window.setTimeout(() => setResendSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendSecondsLeft]);

  const startResendCooldown = useCallback(() => {
    setResendSecondsLeft(RESEND_COOLDOWN_SEC);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(window.location.search);

        if (hash && hash.includes("access_token")) {
          const hp = new URLSearchParams(hash.replace(/^#/, ""));
          const access = hp.get("access_token");
          const refresh = hp.get("refresh_token");

          if (access && refresh) {
            const { error: err } = await recoverySupabase.auth.setSession({
              access_token: access,
              refresh_token: refresh,
            });

            if (err) throw err;

            window.history.replaceState(null, "", window.location.pathname);
            setScreen({ kind: "set_password" });
            return;
          }

          throw new Error("Invalid or expired link");
        }

        const code = params.get("code");
        if (code) {
          const { error: err } = await recoverySupabase.auth.exchangeCodeForSession(code);
          if (err) throw err;

          window.history.replaceState(null, "", window.location.pathname);
          setScreen({ kind: "set_password" });
          return;
        }

        const { data } = await supabase.auth.getSession();

        if (data.session) {
          window.location.replace(destination);
          return;
        }

        setScreen({ kind: "email" });
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong");
        setScreen({ kind: "link_error" });
      }
    };

    void init();
  }, [destination]);

  useEffect(() => {
    if (screen.kind !== "set_password_success") return;
    const t = window.setTimeout(() => {
      window.location.href = destination;
    }, 2500);
    return () => window.clearTimeout(t);
  }, [screen.kind, destination]);

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

    setScreen({ kind: "set_password_success" });
  }

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setStepError(null);
    const em = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setStepError("Please enter a valid email address.");
      return;
    }
    if (!isSupabaseConfigured) {
      setStepError("Sign-in isn’t configured in this environment.");
      return;
    }

    setBusy(true);
    await supabase.auth.signOut();

    const { state, rawError } = await getEmailAccessState(supabase, em);
    setBusy(false);

    if (rawError) {
      setStepError("We couldn’t verify this email. Please try again.");
      return;
    }

    switch (state) {
      case "unknown":
        setScreen({ kind: "no_account", email: em });
        break;
      case "unconfirmed":
        setScreen({ kind: "needs_activation", email: em });
        break;
      case "active":
        setLoginPw("");
        setScreen({ kind: "sign_in", email: em });
        break;
      default:
        setStepError("Something went wrong. Please try again.");
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (screen.kind !== "sign_in") return;

    setBusy(true);
    setStepError(null);

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: screen.email,
      password: loginPw,
    });

    setBusy(false);

    if (signErr) {
      setStepError("Incorrect password. Please try again.");
      return;
    }

    window.location.href = destination;
  }

  async function sendAccessEmail(targetEmail: string) {
    if (!isSupabaseConfigured || resendSecondsLeft > 0) return;
    setBusy(true);
    setStepError(null);
    const { error: err } = await recoverySupabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: authEmailRedirect,
    });
    setBusy(false);
    if (err) {
      setStepError(err.message);
      return;
    }
    startResendCooldown();
  }

  async function handleForgotPassword() {
    if (screen.kind !== "sign_in" || resendSecondsLeft > 0) return;
    await sendAccessEmail(screen.email);
  }

  const passwordSubmitDisabled = busy || password.length < 6 || password !== confirmPw;
  const signInDisabled = busy || !loginPw;
  const continueDisabled = busy || !emailInput.trim();

  if (screen.kind === "loading") {
    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
        <main className="flex min-h-screen items-center justify-center bg-cb-green">
          <p className="text-white">Loading...</p>
        </main>
      </>
    );
  }

  if (screen.kind === "set_password_success") {
    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
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

  if (screen.kind === "set_password") {
    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
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

              <button className="cb-btn-primary" type="submit" disabled={passwordSubmitDisabled}>
                {busy ? "Securing your account…" : "Continue to dashboard"}
              </button>
            </form>
          </div>
        </main>
      </>
    );
  }

  if (screen.kind === "link_error") {
    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md text-center">
            <h1 className="cb-card-title">This link has expired</h1>
            {error && <p className="cb-message-error mt-2 text-sm">{error}</p>}
            <p className="mt-2 text-sm text-cb-green/90">
              Your access link is no longer valid. Request a new one to continue.
            </p>

            <button
              type="button"
              className="cb-btn-primary mt-6"
              onClick={() => {
                setError(null);
                setScreen({ kind: "email" });
              }}
            >
              Back to login
            </button>
          </div>
        </main>
      </>
    );
  }

  if (screen.kind === "email") {
    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md w-full">
            <h1 className="cb-card-title text-center">Access your account</h1>
            <p className="cb-card-subtitle mt-2 text-center">Enter your email to continue.</p>

            {stepError && <p className="cb-message-error mt-4">{stepError}</p>}

            <form onSubmit={handleEmailContinue} className="mt-6 flex flex-col gap-4">
              <input
                className="cb-input"
                type="email"
                placeholder="Email"
                autoComplete="email"
                autoFocus
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />

              <button className="cb-btn-primary" type="submit" disabled={continueDisabled}>
                {busy ? "Please wait…" : "Continue"}
              </button>
            </form>
          </div>
        </main>
      </>
    );
  }

  if (screen.kind === "no_account") {
    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md w-full text-center">
            <h1 className="cb-card-title">This email isn&apos;t registered yet.</h1>
            <p className="cb-card-subtitle mt-3">Subscribe to a plan to get access.</p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                className="cb-btn-primary"
                onClick={() => {
                  window.location.href = "/pricing";
                }}
              >
                View all plans
              </button>
              <button
                type="button"
                className="cb-btn-secondary"
                onClick={() => {
                  setEmailInput("");
                  setScreen({ kind: "email" });
                }}
              >
                Already subscribed? Check your email
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (screen.kind === "needs_activation") {
    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md w-full text-center">
            <h1 className="cb-card-title">Your account isn&apos;t activated yet.</h1>
            <p className="cb-card-subtitle mt-3">Check your email for the activation link.</p>
            <p className="mt-2 text-xs text-cb-green/70">
              Didn&apos;t receive it? We can send another link to {screen.email}.
            </p>

            {stepError && <p className="cb-message-error mt-4 text-left text-sm">{stepError}</p>}

            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                className="cb-btn-primary"
                disabled={busy || resendSecondsLeft > 0}
                onClick={() => void sendAccessEmail(screen.email)}
              >
                {resendSecondsLeft > 0
                  ? `Wait ${resendSecondsLeft}s to resend`
                  : busy
                    ? "Sending…"
                    : "Resend activation email"}
              </button>
              <button
                type="button"
                className="cb-btn-secondary"
                onClick={() => {
                  setEmailInput("");
                  setScreen({ kind: "email" });
                }}
              >
                Use a different email
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (screen.kind === "sign_in") {
    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md w-full">
            <h1 className="cb-card-title text-center">Welcome back</h1>
            <p className="cb-card-subtitle mt-2 text-center">Enter your password to continue.</p>
            <p className="mt-2 text-center text-sm text-cb-green/80">{screen.email}</p>

            {stepError && <p className="cb-message-error mt-4">{stepError}</p>}

            <form onSubmit={handleSignIn} className="mt-6 flex flex-col gap-4">
              <div className="overflow-hidden transition-all duration-300 ease-out">
                <input
                  className="cb-input"
                  type="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  autoFocus
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                />
              </div>

              <button className="cb-btn-primary" type="submit" disabled={signInDisabled}>
                {busy ? "Signing you in…" : "Sign in"}
              </button>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-4">
                <button
                  type="button"
                  className="text-sm font-medium text-cb-green underline decoration-cb-gold/50 underline-offset-2 hover:text-cb-green/90"
                  disabled={busy || resendSecondsLeft > 0}
                  onClick={() => void handleForgotPassword()}
                >
                  {resendSecondsLeft > 0 ? `Forgot password? (${resendSecondsLeft}s)` : "Forgot password?"}
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-cb-green/80 hover:text-cb-green"
                  onClick={() => {
                    setEmailInput(screen.email);
                    setLoginPw("");
                    setScreen({ kind: "email" });
                  }}
                >
                  Use a different email
                </button>
              </div>
            </form>
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
