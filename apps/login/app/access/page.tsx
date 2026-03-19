"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase, recoverySupabase } from "@/lib/supabaseClient";

const PLATFORM_URL =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLATFORM_APP_URL : undefined) ??
  "https://platform.thecapitalbridge.com";
const ACCESS_ORIGIN =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_LOGIN_APP_URL ?? "https://login.thecapitalbridge.com").replace(/\/$/, "");

const btn =
  "w-full rounded-xl px-4 py-3 font-medium transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100";
const btnPrimary = `${btn} bg-cb-gold text-cb-green shadow-lg`;
const btnSecondary = `${btn} border-2 border-cb-gold/60 bg-white/90 text-cb-green`;

type View =
  | "loading"
  | "password_setup"
  | "password_done"
  | "error"
  | "login"
  | "magic_sent"
  | "resend_email";

const SESSION_SYNC_RETRIES = 5;
const SESSION_SYNC_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getLoginErrorMessage(err: { message?: string; code?: string }): string {
  const msg = (err.message ?? "").toLowerCase();
  const code = (err.code ?? "").toLowerCase();
  if (code === "invalid_login_credentials" || msg.includes("invalid login credentials")) {
    return "Wrong email or password. Please try again.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment.";
  }
  return err.message ?? "Something went wrong. Please try again.";
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

  const destination = useMemo(() => {
    const platformBase = PLATFORM_URL.replace(/\/$/, "");
    if (redirectTo && redirectTo.startsWith(platformBase)) return redirectTo;
    return `${platformBase}/`;
  }, [redirectTo]);

  const resolveSession = useCallback(async () => {
    setError(null);
    const search = typeof window !== "undefined" ? window.location.search : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const searchParamsLocal = new URLSearchParams(search);
    const code = searchParamsLocal.get("code");

    if (code) {
      const { error: exErr } = await recoverySupabase.auth.exchangeCodeForSession(code);
      if (!exErr) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search.replace(/[?&]code=[^&]+/, "").replace(/^&/, "?"));
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
    const hashHasRecovery = hash.includes("type=recovery") || hp.get("type") === "recovery";
    if (session?.user && hashHasRecovery) {
      setView("password_setup");
      return;
    }

    setView("login");
  }, []);

  useEffect(() => {
    resolveSession();
  }, [resolveSession]);

  useEffect(() => {
    if (view !== "password_done") return;
    const t = setTimeout(() => {
      window.location.href = destination;
    }, 1600);
    return () => clearTimeout(t);
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
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: loginPw,
    });
    if (signInError) {
      setBusy(false);
      setError(getLoginErrorMessage(signInError));
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
      redirectTo: `${ACCESS_ORIGIN}/access`,
    });
    setBusy(false);
    if (rErr) {
      setError(rErr.message);
      return;
    }
    setView("magic_sent");
  }

  async function handleMagicLink() {
    setError(null);
    const em = email.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const { error: oErr } = await supabase.auth.signInWithOtp({
      email: em,
      options: { emailRedirectTo: `${ACCESS_ORIGIN}/access` },
    });
    setBusy(false);
    if (oErr) {
      setError(oErr.message);
      return;
    }
    setView("magic_sent");
  }

  if (view === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
        <div className="cb-card max-w-md text-center">
          <p className="cb-card-subtitle text-base">Setting things up for you…</p>
        </div>
      </main>
    );
  }

  if (view === "password_setup") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
        <div className="cb-card max-w-md">
          <h1 className="cb-card-title text-center">You&apos;re in 🎉</h1>
          <p className="cb-card-subtitle mt-2 text-center">Secure your account by setting a password.</p>
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
              {busy ? "Saving…" : "Set Password & Continue"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (view === "password_done") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">You&apos;re all set 🎉</h1>
          <p className="cb-card-subtitle mt-2">Opening your Capital Bridge workspace…</p>
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
          <p className="cb-card-subtitle mt-2 text-center">
            Use the options below — we&apos;ll get you back on track.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => { setView("resend_email"); setError(null); }}>
              Send Me a New Access Link
            </button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => { setView("login"); setError(null); }}>
              Log In Instead
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
          <h1 className="cb-card-title text-center">Send a new link</h1>
          <p className="cb-card-subtitle mt-2 text-center">Enter the email you used at checkout.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleResendLink();
            }}
            className="mt-6 flex flex-col gap-4"
          >
            {error && <p className="cb-message-error text-sm">{error}</p>}
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-cb-green">Email</span>
              <input className="cb-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy ? "Sending…" : "Send Access Link"}
            </button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => setView("login")}>
              Back to Log In
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (view === "magic_sent") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Check your email</h1>
          <p className="cb-card-subtitle mt-2">We sent you a link. Open it on this device to continue.</p>
          <button type="button" className={`${btnPrimary} mt-6`} onClick={() => setView("login")}>
            Back to Log In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
      <div className="cb-card max-w-md">
        <h1 className="cb-card-title text-center">Log in to your account</h1>
        <p className="cb-card-subtitle mt-2 text-center">Use your email and password, or get a magic link.</p>
        {!isSupabaseConfigured && (
          <p className="cb-message-error mt-4 text-center text-sm">Sign-in is not configured for this environment.</p>
        )}
        <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
          {error && <p className="cb-message-error text-sm">{error}</p>}
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-cb-green">Email</span>
            <input className="cb-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-cb-green">Password</span>
            <input className="cb-input" type="password" autoComplete="current-password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} required />
          </label>
          <button type="submit" className={btnPrimary} disabled={busy || !isSupabaseConfigured}>
            {busy ? "Signing in…" : "Log In"}
          </button>
        </form>
        <div className="mt-4 flex flex-col gap-3">
          <button type="button" className={btnSecondary} disabled={busy || !isSupabaseConfigured} onClick={() => void handleMagicLink()}>
            {busy ? "Sending…" : "Send Magic Link Instead"}
          </button>
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => { setView("resend_email"); setError(null); }}>
            Forgot Password
          </button>
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
            <p className="cb-card-subtitle">Loading…</p>
          </div>
        </main>
      }
    >
      <AccessInner />
    </Suspense>
  );
}
