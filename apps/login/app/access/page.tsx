"use client";

import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase, recoverySupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getAccessRedirectUrlForAuthEmails } from "@/lib/authEmailRedirect";
import {
  ACCESS_EMAIL_COOLDOWN_SEC,
  ACCESS_EMAIL_SENT_MESSAGE,
  accessEmailResendButtonLabel,
} from "@/lib/resendAccessEmail";
import { persistCheckoutEmail, readPersistedCheckoutEmail } from "@/lib/checkoutEmailPersistence";

const PLATFORM_URL =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLATFORM_APP_URL : undefined) ??
  "https://platform.thecapitalbridge.com";

const LOGIN_ERROR_COPY =
  "Incorrect email or password. If you've just signed up, check your email to set your password.";

const NO_PASSWORD_HELPER =
  "New here? Check your email for a link to set your password. Already paid? Use Send password link again below.";

const SET_PASSWORD_LINK_EXPIRY_HINT =
  "This link will expire in 10 minutes. Please complete this step now.";

const PASSWORD_REQUIREMENTS_COPY =
  "Use at least 6 characters. For better security, include letters, numbers, and symbols.";

const PASSWORD_TOO_SHORT_MSG = "Password must be at least 6 characters.";

const PASSWORD_MISMATCH_MSG = "Passwords do not match.";

const DISABLED_SUBMIT_HELPER = "Please fix the errors above to continue.";

function isLikelySessionExpiredError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("expired") ||
    m.includes("jwt expired") ||
    m.includes("invalid jwt") ||
    m.includes("session expired") ||
    m.includes("session not found") ||
    m.includes("invalid refresh token") ||
    m.includes("refresh token") ||
    (m.includes("invalid") && m.includes("token"))
  );
}

type View = "loading" | "set_password" | "login" | "error" | "success";

function PasswordInputWithToggle({
  value,
  onChange,
  placeholder,
  autoComplete,
  visible,
  onToggleVisible,
  hasError,
  autoFocus,
  ariaInvalid,
  ariaDescribedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  visible: boolean;
  onToggleVisible: () => void;
  hasError?: boolean;
  autoFocus?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}) {
  return (
    <div className="relative">
      <input
        className={`cb-input pr-11 ${hasError ? "cb-input-error" : ""}`}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      <button
        type="button"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-cb-green/75 transition hover:bg-cb-green/[0.07] hover:text-cb-green focus:outline-none focus-visible:ring-2 focus-visible:ring-cb-gold/45"
        onClick={onToggleVisible}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

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
  const [setPwApiError, setSetPwApiError] = useState<string | null>(null);
  const [setPasswordLinkExpired, setSetPasswordLinkExpired] = useState(false);
  const [setPwRecoveryEmail, setSetPwRecoveryEmail] = useState("");

  const [email, setEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [busy, setBusy] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [errorScreenEmail, setErrorScreenEmail] = useState("");

  const loginEmailHydrated = useRef(false);
  const errorEmailHydrated = useRef(false);

  const destination = useMemo(() => `${PLATFORM_URL.replace(/\/$/, "")}/`, []);
  const redirectTo = useMemo(() => getAccessRedirectUrlForAuthEmails(), []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (view !== "set_password") {
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
    if (view !== "login") setShowLoginPassword(false);
  }, [view]);

  const sendAccessEmail = useCallback(
    async (targetEmail: string) => {
      const em = targetEmail.trim();
      if (!em || !isSupabaseConfigured || resendCooldown > 0) return false;
      setResendError(null);
      setResendBusy(true);
      setResendSuccess(null);
      const { error: err } = await recoverySupabase.auth.resetPasswordForEmail(em, {
        redirectTo,
      });
      setResendBusy(false);
      if (err) {
        setResendError(err.message);
        return false;
      }
      persistCheckoutEmail(em);
      setResendSuccess(ACCESS_EMAIL_SENT_MESSAGE);
      setResendCooldown(ACCESS_EMAIL_COOLDOWN_SEC);
      return true;
    },
    [redirectTo, resendCooldown]
  );

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
            setView("set_password");
            return;
          }

          throw new Error("Invalid or expired link");
        }

        const code = params.get("code");
        if (code) {
          const { error: err } = await recoverySupabase.auth.exchangeCodeForSession(code);
          if (err) throw err;

          window.history.replaceState(null, "", window.location.pathname);
          setView("set_password");
          return;
        }

        const { data } = await supabase.auth.getSession();

        if (data.session) {
          window.location.replace(destination);
          return;
        }

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
    if (view !== "login" || loginEmailHydrated.current) return;
    loginEmailHydrated.current = true;
    const qp = searchParams.get("email")?.trim();
    const stored = readPersistedCheckoutEmail();
    const next = qp || stored || "";
    if (next) setEmail(next);
    if (qp && typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      p.delete("email");
      const path = `${window.location.pathname}${p.toString() ? `?${p.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", path);
    }
  }, [view, searchParams]);

  useEffect(() => {
    if (view !== "error" || errorEmailHydrated.current) return;
    errorEmailHydrated.current = true;
    const qp = searchParams.get("email")?.trim();
    const stored = readPersistedCheckoutEmail();
    const next = qp || stored || "";
    if (next) setErrorScreenEmail(next);
    if (qp && typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      p.delete("email");
      const path = `${window.location.pathname}${p.toString() ? `?${p.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", path);
    }
  }, [view, searchParams]);

  useEffect(() => {
    if (view !== "success") return;
    const t = window.setTimeout(() => {
      window.location.href = destination;
    }, 2500);
    return () => window.clearTimeout(t);
  }, [view, destination]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6 || password !== confirmPw) {
      return;
    }

    setBusy(true);
    setSetPwApiError(null);

    const { error: updateErr } = await recoverySupabase.auth.updateUser({
      password,
    });

    setBusy(false);

    if (updateErr) {
      if (isLikelySessionExpiredError(updateErr.message)) {
        const { data } = await recoverySupabase.auth.getUser();
        const fromSession = data.user?.email?.trim() || "";
        setSetPwRecoveryEmail(fromSession || readPersistedCheckoutEmail() || "");
        setSetPasswordLinkExpired(true);
        setSetPwApiError(null);
        return;
      }
      setSetPwApiError(updateErr.message);
      return;
    }

    setView("success");
  }

  async function handleResendFromSetPasswordExpired() {
    setSetPwApiError(null);
    const em = setPwRecoveryEmail.trim();
    if (!em) {
      setSetPwApiError("Enter the email you used at checkout.");
      return;
    }
    await sendAccessEmail(em);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setError(null);
    setResendSuccess(null);
    setResendError(null);

    const trimmed = email.trim();
    if (trimmed) persistCheckoutEmail(trimmed);

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password: loginPw,
    });

    setBusy(false);

    if (signErr) {
      setError(LOGIN_ERROR_COPY);
      return;
    }

    window.location.href = destination;
  }

  async function handleResendFromLogin() {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email above, then tap Send password link again.");
      return;
    }
    await sendAccessEmail(email);
  }

  async function handleResendFromErrorScreen() {
    setError(null);
    if (!errorScreenEmail.trim()) {
      setError("Enter the email you used at checkout.");
      return;
    }
    await sendAccessEmail(errorScreenEmail);
  }

  if (view === "loading") {
    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
        <main className="flex min-h-screen items-center justify-center bg-cb-green">
          <p className="text-white">Loading...</p>
        </main>
      </>
    );
  }

  if (view === "success") {
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

  if (view === "set_password") {
    const passwordTooShort = password.length > 0 && password.length < 6;
    const passwordsMismatch = confirmPw.length > 0 && password !== confirmPw;
    const lengthOk = password.length >= 6;
    const passwordsMatch = lengthOk && confirmPw.length > 0 && password === confirmPw;
    const formValid = lengthOk && password === confirmPw && confirmPw.length > 0;
    const passwordSubmitDisabled = busy || !formValid;
    const userStartedSetPw = password.length > 0 || confirmPw.length > 0;
    const showDisabledHelper = !busy && !formValid && userStartedSetPw;

    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md w-full">
            {setPasswordLinkExpired ? (
              <>
                <h1 className="cb-card-title text-center">This link has expired.</h1>
                <p className="cb-card-subtitle mt-2 text-center">
                  Request a new email to set your password. Use the same address you used at checkout.
                </p>
                {resendSuccess && (
                  <p className="mt-4 rounded-lg bg-cb-green/10 px-3 py-2 text-sm font-medium text-cb-green">
                    {resendSuccess}
                  </p>
                )}
                {resendError && <p className="cb-message-error mt-3 text-sm">{resendError}</p>}
                {setPwApiError && <p className="cb-message-error mt-3 text-sm">{setPwApiError}</p>}
                <div className="mt-6 flex flex-col gap-3 text-left">
                  <label className="text-xs font-medium text-cb-green/80">Email</label>
                  <input
                    className="cb-input"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={setPwRecoveryEmail}
                    onChange={(e) => {
                      setSetPwRecoveryEmail(e.target.value);
                      setResendSuccess(null);
                      setResendError(null);
                      setSetPwApiError(null);
                    }}
                    onBlur={() => {
                      const t = setPwRecoveryEmail.trim();
                      if (t.includes("@")) persistCheckoutEmail(t);
                    }}
                  />
                  <button
                    type="button"
                    className="cb-btn-secondary"
                    disabled={
                      resendBusy || resendCooldown > 0 || !setPwRecoveryEmail.trim() || !isSupabaseConfigured
                    }
                    onClick={() => void handleResendFromSetPasswordExpired()}
                  >
                    {accessEmailResendButtonLabel(resendCooldown, resendBusy)}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="cb-card-title text-center">Set your password</h1>
                <p
                  className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-center text-xs font-medium leading-relaxed text-cb-green"
                  role="status"
                >
                  {SET_PASSWORD_LINK_EXPIRY_HINT}
                </p>
                <p className="cb-card-subtitle mt-3 text-center">
                  Set your password to access your account.
                </p>

                {setPwApiError && <p className="cb-message-error mt-4">{setPwApiError}</p>}

                <form onSubmit={handleSetPassword} className="mt-5 flex flex-col gap-4">
                  <p className="text-sm leading-relaxed text-cb-green/85">{PASSWORD_REQUIREMENTS_COPY}</p>

                  <div className="flex flex-col gap-1">
                    <PasswordInputWithToggle
                      value={password}
                      onChange={(v) => {
                        setPassword(v);
                        setSetPwApiError(null);
                      }}
                      placeholder="New password"
                      autoComplete="new-password"
                      visible={showNewPassword}
                      onToggleVisible={() => setShowNewPassword((s) => !s)}
                      hasError={passwordTooShort}
                      autoFocus
                      ariaInvalid={passwordTooShort}
                      ariaDescribedBy={passwordTooShort ? "pw-length-err" : undefined}
                    />
                    {passwordTooShort && (
                      <p id="pw-length-err" className="text-xs text-red-700">
                        {PASSWORD_TOO_SHORT_MSG}
                      </p>
                    )}
                    {lengthOk && (
                      <p className="text-xs font-medium text-cb-green">✓ At least 6 characters</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <PasswordInputWithToggle
                      value={confirmPw}
                      onChange={(v) => {
                        setConfirmPw(v);
                        setSetPwApiError(null);
                      }}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      visible={showConfirmPassword}
                      onToggleVisible={() => setShowConfirmPassword((s) => !s)}
                      hasError={passwordsMismatch}
                      ariaInvalid={passwordsMismatch}
                      ariaDescribedBy={passwordsMismatch ? "pw-match-err" : undefined}
                    />
                    {passwordsMismatch && (
                      <p id="pw-match-err" className="text-xs text-red-700">
                        {PASSWORD_MISMATCH_MSG}
                      </p>
                    )}
                    {passwordsMatch && (
                      <p className="text-xs font-medium text-cb-green">✓ Passwords match</p>
                    )}
                  </div>

                  <button className="cb-btn-primary" type="submit" disabled={passwordSubmitDisabled}>
                    {busy ? "Setting your password…" : "Set password and continue"}
                  </button>
                  {showDisabledHelper && (
                    <p className="text-center text-xs text-cb-green/70">{DISABLED_SUBMIT_HELPER}</p>
                  )}
                </form>
              </>
            )}
          </div>
        </main>
      </>
    );
  }

  if (view === "login") {
    const loginDisabled = busy || !email.trim() || !loginPw;

    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md w-full">
            <h1 className="cb-card-title text-center">Welcome back</h1>
            <p className="cb-card-subtitle mt-2 text-center">
              Enter your email and password to continue.
            </p>

            {error && <p className="cb-message-error mt-4">{error}</p>}
            {resendSuccess && (
              <p className="mt-3 rounded-lg bg-cb-green/10 px-3 py-2 text-sm font-medium text-cb-green">{resendSuccess}</p>
            )}
            {resendError && <p className="cb-message-error mt-3 text-sm">{resendError}</p>}

            <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
              <input
                className="cb-input"
                type="email"
                placeholder="Email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResendSuccess(null);
                  setResendError(null);
                }}
                onBlur={() => {
                  const t = email.trim();
                  if (t.includes("@")) persistCheckoutEmail(t);
                }}
              />

              <PasswordInputWithToggle
                value={loginPw}
                onChange={setLoginPw}
                placeholder="Enter your password"
                autoComplete="current-password"
                visible={showLoginPassword}
                onToggleVisible={() => setShowLoginPassword((s) => !s)}
              />

              <p className="text-sm text-cb-green/80">{NO_PASSWORD_HELPER}</p>

              <button className="cb-btn-primary" type="submit" disabled={loginDisabled}>
                {busy ? "Signing you in…" : "Access dashboard"}
              </button>
            </form>

            <div className="mt-4 flex flex-col gap-2 border-t border-cb-green/10 pt-4">
              <button
                type="button"
                className="cb-btn-secondary text-sm"
                disabled={resendBusy || resendCooldown > 0 || !email.trim() || !isSupabaseConfigured}
                onClick={() => void handleResendFromLogin()}
              >
                {accessEmailResendButtonLabel(resendCooldown, resendBusy)}
              </button>
              <div className="mt-5 flex flex-col items-center gap-2 border-t border-cb-green/10 pt-5">
                <p className="text-center text-xs leading-relaxed text-cb-green/70">
                  Don&apos;t have access yet? View available plans.
                </p>
                <button
                  type="button"
                  className="cb-btn-auth-view-plans max-w-[12rem]"
                  onClick={() => {
                    window.location.href = "/pricing";
                  }}
                >
                  View plans
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (view === "error") {
    return (
      <>
        <PlatformAccessNotice membershipInactive={membershipInactive} sessionCleared={sessionCleared} />
        <main className="flex min-h-screen items-center justify-center bg-cb-green p-5">
          <div className="cb-card max-w-md w-full text-center">
            <h1 className="cb-card-title">This link has expired</h1>
            {error && <p className="cb-message-error mt-2 text-sm">{error}</p>}
            <p className="mt-2 text-sm text-cb-green/90">
              Send yourself a fresh link below, or go back to sign in.
            </p>

            <div className="mt-6 flex flex-col gap-3 text-left">
              <label className="text-xs font-medium text-cb-green/80">Email you used at checkout</label>
              <input
                className="cb-input"
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={errorScreenEmail}
                onChange={(e) => {
                  setErrorScreenEmail(e.target.value);
                  setResendSuccess(null);
                  setResendError(null);
                }}
                onBlur={() => {
                  const t = errorScreenEmail.trim();
                  if (t.includes("@")) persistCheckoutEmail(t);
                }}
              />
              {resendSuccess && (
                <p className="rounded-lg bg-cb-green/10 px-3 py-2 text-sm font-medium text-cb-green">{resendSuccess}</p>
              )}
              {resendError && <p className="cb-message-error text-sm">{resendError}</p>}
              <button
                type="button"
                className="cb-btn-secondary"
                disabled={resendBusy || resendCooldown > 0 || !errorScreenEmail.trim() || !isSupabaseConfigured}
                onClick={() => void handleResendFromErrorScreen()}
              >
                {accessEmailResendButtonLabel(resendCooldown, resendBusy)}
              </button>
            </div>

            <button
              type="button"
              className="cb-btn-primary mt-6 w-full"
              onClick={() => {
                setEmail(errorScreenEmail.trim() || email);
                setError(null);
                setResendSuccess(null);
                setResendError(null);
                setView("login");
              }}
            >
              Back to sign in
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
