"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase, recoverySupabase } from "@/lib/supabaseClient";
import { getAccessRedirectUrlForAuthEmails } from "@/lib/authEmailRedirect";

const PLATFORM_URL =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLATFORM_APP_URL : undefined) ??
  "https://platform.thecapitalbridge.com";

const btn =
  "w-full rounded-xl px-4 py-3 font-medium transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100";
const btnPrimary = `${btn} bg-cb-gold text-base font-semibold text-cb-green shadow-lg`;
const btnSecondary = `${btn} border-2 border-cb-gold/60 bg-white/90 text-cb-green`;

type View =
  | "loading"
  | "password_setup"
  | "password_done"
  | "error"
  | "login"
  | "secure_link_sent"
  | "resend_email";

const SESSION_SYNC_RETRIES = 5;
const SESSION_SYNC_DELAY_MS = 500;
const PASSWORD_SUCCESS_HOLD_MS = 5000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getLoginErrorMessage(err: { message?: string; code?: string }): string {
  const msg = (err.message ?? "").toLowerCase();
  const code = (err.code ?? "").toLowerCase();
  if (code === "invalid_login_credentials" || msg.includes("invalid login credentials")) {
    return "";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment.";
  }
  return err.message ?? "Something went wrong. Please try again.";
}

function stripQueryParams(keys: string[]) {
  const u = new URL(window.location.href);
  keys.forEach((k) => u.searchParams.delete(k));
  const qs = u.searchParams.toString();
  window.history.replaceState(null, "", `${u.pathname}${qs ? `?${qs}` : ""}`);
}

function AccessInner() {
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => searchParams.get("redirectTo"), [searchParams]);

  const [view, setView] = useState<View>("loading");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [email, setEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [invalidSession, setInvalidSession] = useState(false);
  const [successSecondsLeft, setSuccessSecondsLeft] = useState(5);
  const [showPasswordNotSetHint, setShowPasswordNotSetHint] = useState(false);

  const destination = useMemo(() => {
    const platformBase = PLATFORM_URL.replace(/\/$/, "");
    if (redirectTo && redirectTo.startsWith(platformBase)) return redirectTo;
    return `${platformBase}/`;
  }, [redirectTo]);

  const authEmailRedirect = useMemo(() => getAccessRedirectUrlForAuthEmails(), []);

  const resolveSession = useCallback(async () => {
    setError(null);
    setInvalidSession(false);
    const search = typeof window !== "undefined" ? window.location.search : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const sp = new URLSearchParams(search);
    const code = sp.get("code");

    if (code) {
      const { error: exErr } = await recoverySupabase.auth.exchangeCodeForSession(code);
      if (!exErr) {
        stripQueryParams(["code"]);
        setView("password_setup");
        return;
      }
      setInvalidSession(true);
      setView("error");
      return;
    }

    const qAccess = sp.get("access_token");
    const qRefresh = sp.get("refresh_token");
    if (qAccess && qRefresh) {
      const { error: sErr } = await supabase.auth.setSession({
        access_token: qAccess,
        refresh_token: qRefresh,
      });
      if (!sErr) {
        stripQueryParams(["access_token", "refresh_token"]);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setView("password_setup");
        return;
      }
      setInvalidSession(true);
      setView("error");
      return;
    }

    const hp = new URLSearchParams(hash.replace(/^#/, ""));
    const access_token = hp.get("access_token");
    const refresh_token = hp.get("refresh_token");
    if (access_token && refresh_token) {
      const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token });
      if (!sErr) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setView("password_setup");
        return;
      }
      setInvalidSession(true);
      setView("error");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      window.location.replace(destination);
      return;
    }

    setView("login");
  }, [destination]);

  useEffect(() => {
    void resolveSession();
  }, [resolveSession]);

  useEffect(() => {
    if (view !== "password_done") return;
    const totalSec = Math.ceil(PASSWORD_SUCCESS_HOLD_MS / 1000);
    setSuccessSecondsLeft(totalSec);
    const tick = setInterval(() => {
      setSuccessSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    const t = setTimeout(() => {
      window.location.href = destination;
    }, PASSWORD_SUCCESS_HOLD_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(t);
    };
  }, [view, destination]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPw) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: uErr } = await recoverySupabase.auth.updateUser({ password });
    setBusy(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    setView("password_done");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowPasswordNotSetHint(false);
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: loginPw,
    });
    if (signInError) {
      setBusy(false);
      const code = (signInError.code ?? "").toLowerCase();
      const msg = (signInError.message ?? "").toLowerCase();
      if (code === "invalid_login_credentials" || msg.includes("invalid login credentials")) {
        setShowPasswordNotSetHint(true);
        setError(
          "If you already created a password, check your email address and password for typos."
        );
      } else {
        setError(getLoginErrorMessage(signInError) || signInError.message);
      }
      return;
    }
    let membershipExpired = false;
    for (let attempt = 0; attempt < SESSION_SYNC_RETRIES; attempt += 1) {
      try {
        await fetch("/api/register-session", { method: "POST", credentials: "include" });
      } catch {
        /* noop */
      }
      try {
        const res = await fetch("/api/membership-status", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          await sleep(SESSION_SYNC_DELAY_MS);
          continue;
        }
        if (data.active === false) membershipExpired = true;
        break;
      } catch {
        break;
      }
    }
    setBusy(false);
    if (membershipExpired) {
      setError("Your membership has expired.");
      return;
    }
    window.location.href = destination;
  }

  async function handleResendLink() {
    setError(null);
    const em = email.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Enter a valid email address.");
      setView("resend_email");
      return;
    }
    setBusy(true);
    const { error: rErr } = await supabase.auth.resetPasswordForEmail(em, {
      redirectTo: authEmailRedirect,
    });
    setBusy(false);
    if (rErr) {
      setError(rErr.message);
      return;
    }
    setView("secure_link_sent");
  }

  async function handleResendFromPasswordStep() {
    setError(null);
    setBusy(true);
    const { data } = await supabase.auth.getSession();
    const em = data.session?.user?.email?.trim();
    if (!em) {
      setBusy(false);
      setError('We could not detect your email. Use "Resend access email" on the sign-in step.');
      return;
    }
    const { error: rErr } = await supabase.auth.resetPasswordForEmail(em, {
      redirectTo: authEmailRedirect,
    });
    setBusy(false);
    if (rErr) {
      setError(rErr.message);
      return;
    }
    setView("secure_link_sent");
  }

  async function handleSecureLoginLink() {
    setError(null);
    const em = email.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const { error: oErr } = await supabase.auth.signInWithOtp({
      email: em,
      options: { emailRedirectTo: authEmailRedirect },
    });
    setBusy(false);
    if (oErr) {
      setError(oErr.message);
      return;
    }
    setView("secure_link_sent");
  }

  if (view === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
        <div className="cb-card max-w-md text-center">
          <p className="cb-card-subtitle text-base font-medium">Securing your access…</p>
        </div>
      </main>
    );
  }

  if (view === "password_setup") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cb-green p-5">
        <div className="mb-3 w-full max-w-md">
          <button type="button" className="cb-btn-view-plans" onClick={() => { window.location.href = "/pricing"; }}>
            View All Plans
          </button>
        </div>
        <div className="cb-card max-w-md w-full">
          <h1 className="cb-card-title text-center text-xl sm:text-2xl">Create your password</h1>
          <p className="cb-card-subtitle mt-2 text-center text-base">
            Set your password to access your Capital Bridge dashboard.
          </p>
          {!isSupabaseConfigured && <p className="cb-message-error mt-4">Configuration error. Contact support.</p>}
          <form onSubmit={handleSetPassword} className="mt-6 flex flex-col gap-4">
            {error && <p className="cb-message-error text-sm">{error}</p>}
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-cb-green">Password</span>
              <input className="cb-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-cb-green">Confirm password</span>
              <input className="cb-input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
            </label>
            <button type="submit" className={btnPrimary} disabled={busy || !isSupabaseConfigured}>
              {busy ? "Securing your access…" : "Save password & continue"}
            </button>
          </form>
          <div className="mt-4 flex justify-center">
            <button type="button" className="cb-btn-view-plans" disabled={busy} onClick={() => void handleResendFromPasswordStep()}>
              Resend access email
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (view === "password_done") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
        <div
          className="cb-card max-w-md text-center"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="mb-3 text-4xl" aria-hidden>
            ✓
          </p>
          <h1 className="cb-card-title text-2xl sm:text-3xl">You&apos;re all set!</h1>
          <p className="cb-card-subtitle mt-3 text-base leading-relaxed">
            Your password is saved and your account is secure.
          </p>
          <p className="mt-4 text-sm font-medium text-cb-green/85">
            {successSecondsLeft > 0
              ? `Opening your workspace in ${successSecondsLeft} second${successSecondsLeft === 1 ? "" : "s"}…`
              : "Opening your workspace…"}
          </p>
        </div>
      </main>
    );
  }

  if (view === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
        <div className="cb-card max-w-md">
          <h1 className="cb-card-title text-center">
            {invalidSession ? "This link has expired" : "Something went wrong"}
          </h1>
          <p className="cb-card-subtitle mt-2 text-center">Choose your next step below.</p>
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => { setView("resend_email"); setError(null); }}>
              Send a new access email
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={busy}
              onClick={() => {
                setView("login");
                setError(null);
              }}
            >
              I already created my password
            </button>
          </div>
          <div className="mt-4 flex justify-center">
            <button type="button" className="cb-btn-view-plans" onClick={() => { window.location.href = "/pricing"; }}>
              View All Plans
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (view === "resend_email") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
        <div className="cb-card max-w-md">
          <h1 className="cb-card-title text-center">Send a new access email</h1>
          <p className="cb-card-subtitle mt-2 text-center">Use the same email you used at checkout.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleResendLink();
            }}
            className="mt-6 flex flex-col gap-4"
          >
            {busy && <p className="text-center text-sm font-medium text-cb-green">Securing your access…</p>}
            {error && <p className="cb-message-error text-sm">{error}</p>}
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-cb-green">Email</span>
              <input className="cb-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy ? "Securing your access…" : "Send access email"}
            </button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => setView("login")}>
              Back to sign in
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (view === "secure_link_sent") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Check your email</h1>
          <p className="cb-card-subtitle mt-2">
            We sent a secure link to that address. Open it on this device to continue.
          </p>
          <button type="button" className={`${btnPrimary} mt-6`} onClick={() => setView("login")}>
            Return to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cb-green p-5">
      <div className="mb-3 w-full max-w-md">
        <button type="button" className="cb-btn-view-plans" onClick={() => { window.location.href = "/pricing"; }}>
          View All Plans
        </button>
      </div>
      <div className="cb-card max-w-md w-full">
        <h1 className="cb-card-title text-center text-xl sm:text-2xl">Access your account</h1>
        <p className="cb-card-subtitle mt-2 text-center">
          Sign in with the email and password you created after checkout.
        </p>
        {!isSupabaseConfigured && (
          <p className="cb-message-error mt-4 text-center text-sm">Sign-in is not configured for this environment.</p>
        )}
        <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
          {showPasswordNotSetHint && (
            <div className="rounded-lg border border-cb-gold/50 bg-amber-50/95 p-4 text-left text-sm text-cb-green shadow-sm">
              <p className="font-semibold leading-snug">
                You haven&apos;t set your password yet. Check your email to activate your account.
              </p>
              <button
                type="button"
                className="cb-btn-view-plans mt-3"
                disabled={busy}
                onClick={() => {
                  if (!email.trim()) {
                    setError("Enter your email above, then tap Resend access email again.");
                    return;
                  }
                  void handleResendLink();
                }}
              >
                Resend access email
              </button>
            </div>
          )}
          {busy && <p className="text-center text-sm font-medium text-cb-green">Securing your access…</p>}
          {error && <p className="cb-message-error text-sm">{error}</p>}
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-cb-green">Email</span>
            <input
              className="cb-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setShowPasswordNotSetHint(false);
              }}
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-cb-green">Password</span>
            <input
              className="cb-input"
              type="password"
              autoComplete="current-password"
              value={loginPw}
              onChange={(e) => setLoginPw(e.target.value)}
              required
            />
          </label>
          <button type="submit" className={btnPrimary} disabled={busy || !isSupabaseConfigured}>
            {busy ? "Securing your access…" : "Sign in"}
          </button>
        </form>
        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            className={btnSecondary}
            disabled={busy || !isSupabaseConfigured}
            onClick={() => void handleSecureLoginLink()}
          >
            {busy ? "Securing your access…" : "Email Me a Secure Login Link"}
          </button>
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => { window.location.href = "/forgot-password"; }}>
            Forgot password
          </button>
          <div className="flex justify-center pt-1">
            <button type="button" className="cb-btn-view-plans" disabled={busy} onClick={() => { setView("resend_email"); setError(null); }}>
              Resend access email
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md text-center">
            <p className="cb-card-subtitle">Securing your access…</p>
          </div>
        </main>
      }
    >
      <AccessInner />
    </Suspense>
  );
}
