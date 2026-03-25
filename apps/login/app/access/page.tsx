"use client";

import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase, recoverySupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getAccessRedirectUrlForAuthEmails } from "@/lib/authEmailRedirect";
import {
  ACCESS_EMAIL_COOLDOWN_SEC,
  ACCESS_EMAIL_SENDING_LABEL,
  accessEmailResendButtonLabel,
  accessEmailResendCooldownLabel,
} from "@/lib/resendAccessEmail";
import {
  PASSWORD_BUTTON,
  PASSWORD_BUTTON_LOADING,
  PASSWORD_PLACEHOLDER,
  PASSWORD_REQUIREMENTS_COPY,
} from "@/lib/accessPageCopy";
import { persistCheckoutEmail, readPersistedCheckoutEmail } from "@/lib/checkoutEmailPersistence";
import { suppressTabSignOutForAuthNavigation } from "@/lib/suppressTabSignOutNav";
import { PaymentTargetEmailLine } from "@/components/PaymentTargetEmailCopy";
import { RegisteredEmailChangeForm } from "@/components/RegisteredEmailChangeForm";
import { CalmAuthMessage } from "@/components/CalmAuthMessage";
import { RecoveryActions } from "@/components/RecoveryActions";
import { SMART_LOCK_MESSAGES } from "@/lib/smartLock";
import {
  COPY_ALREADY_SIGNED_IN,
  COPY_CHECKING_ACCESS_SHORTLY,
  COPY_CONTINUE,
  COPY_EMAIL_MISMATCH,
  COPY_EMAIL_MISMATCH_AFTER_TWO,
  COPY_FINISH_PASSWORD,
  COPY_PAYMENT_PREPARING,
  COPY_RESEND_ACCESS_LINK,
  COPY_TRY_AGAIN_BTN,
  COPY_TRY_ANOTHER_EMAIL,
  COPY_VERIFY_ACCESS_FAILED,
  COPY_WAIT_RESEND,
  COPY_YOURE_ALL_SET,
} from "@/lib/uiCopyConstants";
import {
  ACCESS_ERROR_PAGE_SUBTITLE,
  ACCESS_ERROR_PAGE_TITLE,
  ACCESS_EMAIL_FIELD_LABEL,
  ACCESS_EMAIL_PLACEHOLDER,
  ACCESS_REMOVED_LINE,
  ACCESS_SUPPORT_HINT,
  FORM_COMPLETE_TO_CONTINUE,
  FORM_EMPTY_EMAIL,
  FORM_PASSWORD_MISMATCH,
  FORM_PASSWORD_TOO_SHORT,
  LOGIN_PROMPT_THEN_NEW_LINK,
  resolveCalmAuthMessage,
  resolveLoginCalmAuthMessage,
  SESSION_SIGNED_OUT_LINE,
  SET_PASSWORD_EXPIRED_SUB,
  SET_PASSWORD_EXPIRED_TITLE,
  SET_PASSWORD_EMPTY_EMAIL_FOR_RESEND,
} from "@/lib/sanitizeAuthErrorMessage";

const PLATFORM_URL =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLATFORM_APP_URL : undefined) ??
  "https://platform.thecapitalbridge.com";

const SETUP_PASSWORD_FIRST_MESSAGE =
  "You’re almost there. Please set your password using the email we sent you.";

const NO_PURCHASE_MESSAGE =
  "It looks like you haven’t subscribed yet. Please choose a plan to get started.";

const RATE_LIMIT_MESSAGE = COPY_WAIT_RESEND;

const MEMBERSHIP_PENDING_MESSAGE = COPY_PAYMENT_PREPARING;

/** Dev-only: survives Strict Mode / second init after URL query is stripped (see preview_success flow). */
const DEV_ACCESS_SUCCESS_PREVIEW_KEY = "cb_dev_access_success_preview";

function looksLikeEmail(value: string): boolean {
  const t = value.trim();
  return t.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function appendAllSetParam(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("cb_all_set", "1");
    return u.toString();
  } catch {
    return url;
  }
}

function formatDisplayEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

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

type View = "loading" | "set_password" | "login" | "error" | "success" | "already_signed_in";

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
  membershipVerifyFailed,
}: {
  membershipInactive: boolean;
  sessionCleared: boolean;
  membershipVerifyFailed: boolean;
}) {
  if (!membershipInactive && !sessionCleared && !membershipVerifyFailed) return null;

  if (membershipVerifyFailed) {
    return (
      <div className="w-full border-b border-cb-gold/40 bg-amber-50 px-3 py-2.5 text-center text-cb-green sm:px-4 sm:py-3">
        <p className="text-sm font-semibold">{COPY_VERIFY_ACCESS_FAILED}</p>
        <button
          type="button"
          className="mt-2 text-sm font-bold underline decoration-cb-gold-dark/60 underline-offset-2"
          onClick={() => {
            window.location.href = "/access";
          }}
        >
          {COPY_TRY_AGAIN_BTN}
        </button>
      </div>
    );
  }

  const line = sessionCleared ? SESSION_SIGNED_OUT_LINE : ACCESS_REMOVED_LINE;

  return (
    <div className="w-full border-b border-cb-gold/40 bg-amber-50 px-3 py-2.5 text-center text-cb-green sm:px-4 sm:py-3">
      <p className="text-sm font-semibold">{line}</p>
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

  const membershipVerifyFailed = useMemo(
    () => searchParams.get("membership_verify_failed") === "1",
    [searchParams]
  );

  const [view, setView] = useState<View>("loading");
  /** Login form guidance (wrong sign-in, empty field hints). */
  const [loginFieldMessage, setLoginFieldMessage] = useState<string | null>(null);
  /** Link error view: extra line for 2nd+ load (title + subtitle always shown). */
  const [linkDetailMessage, setLinkDetailMessage] = useState<string | null>(null);
  const [linkTier, setLinkTier] = useState<1 | 2 | 3>(1);

  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [setPwApiError, setSetPwApiError] = useState<string | null>(null);
  const [setPasswordLinkExpired, setSetPasswordLinkExpired] = useState(false);
  const [setPwRecoveryEmail, setSetPwRecoveryEmail] = useState("");

  const [email, setEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [sessionConflictOpen, setSessionConflictOpen] = useState(false);
  const [emailMismatchShowTryOther, setEmailMismatchShowTryOther] = useState(false);
  const loginEmailInputRef = useRef<HTMLInputElement | null>(null);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [busy, setBusy] = useState(false);

  const [resendCooldownEndsAt, setResendCooldownEndsAt] = useState<number | null>(null);
  const [cooldownTick, setCooldownTick] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);
  const [visibilityStamp, setVisibilityStamp] = useState(0);
  const [longActionFeedback, setLongActionFeedback] = useState(false);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [resendSentEmail, setResendSentEmail] = useState<string | null>(null);
  const [loginLockUntilMs, setLoginLockUntilMs] = useState<number | null>(null);
  const [resendLockUntilMs, setResendLockUntilMs] = useState<number | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendTier, setResendTier] = useState<1 | 2 | 3>(1);
  const [passwordTier, setPasswordTier] = useState<1 | 2 | 3>(1);
  const [errorScreenEmail, setErrorScreenEmail] = useState("");
  /** Success screen: seconds left before we suggest using the manual dashboard link. */
  const [successRedirectSeconds, setSuccessRedirectSeconds] = useState(3);

  const loginEmailHydrated = useRef(false);
  const errorEmailHydrated = useRef(false);
  const linkFailRef = useRef(0);
  const resendFailRef = useRef(0);
  const passwordFailRef = useRef(0);
  const loginFailRef = useRef(0);

  const calmNoticeClass =
    "rounded-lg border border-amber-200/80 bg-amber-50/95 px-2.5 py-1.5 text-sm text-cb-green sm:px-3 sm:py-2";

  const destination = useMemo(() => `${PLATFORM_URL.replace(/\/$/, "")}/`, []);
  const redirectTo = useMemo(() => getAccessRedirectUrlForAuthEmails(), []);

  const postSmartLock = useCallback(
    async (
      action: "check" | "fail" | "success",
      kind: "login" | "password_setup" | "resend" | "email_mismatch",
      em: string
    ) => {
      const res = await fetch("/api/auth/smart-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, kind, email: em }),
      });
      return (await res.json().catch(() => ({}))) as {
        locked?: boolean;
        lockUntilMs?: number;
        message?: string;
        failures?: number;
        attemptsHint?: string;
      };
    },
    []
  );

  const resendCooldownSec = useMemo(() => {
    if (!resendCooldownEndsAt) return 0;
    return Math.max(0, Math.ceil((resendCooldownEndsAt - Date.now()) / 1000));
  }, [resendCooldownEndsAt, cooldownTick, visibilityStamp]);

  useEffect(() => {
    if (!resendCooldownEndsAt) return;
    const id = window.setInterval(() => {
      setCooldownTick((t) => t + 1);
      if (Date.now() >= resendCooldownEndsAt) setResendCooldownEndsAt(null);
    }, 500);
    return () => clearInterval(id);
  }, [resendCooldownEndsAt]);

  useEffect(() => {
    const sync = () => {
      setVisibilityStamp((s) => s + 1);
      setCooldownTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (!busy && !resendBusy) {
      setLongActionFeedback(false);
      return;
    }
    const t = window.setTimeout(() => setLongActionFeedback(true), 1000);
    return () => {
      window.clearTimeout(t);
      setLongActionFeedback(false);
    };
  }, [busy, resendBusy]);

  useEffect(() => {
    if (!loginLockUntilMs || loginLockUntilMs <= Date.now()) return;
    const tick = () => {
      const waitSec = Math.max(0, Math.ceil((loginLockUntilMs - Date.now()) / 1000));
      if (waitSec <= 0) {
        setLoginLockUntilMs(null);
        setLoginFieldMessage(null);
        return;
      }
      setLoginFieldMessage(`Too many attempts. Try again in ${waitSec} seconds`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [loginLockUntilMs]);

  useEffect(() => {
    if (!resendLockUntilMs || resendLockUntilMs <= Date.now()) return;
    const tick = () => {
      const waitSec = Math.max(0, Math.ceil((resendLockUntilMs - Date.now()) / 1000));
      if (waitSec <= 0) {
        setResendLockUntilMs(null);
        setResendError(null);
        return;
      }
      setResendError(`Too many attempts. Please try again in ${waitSec} seconds`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [resendLockUntilMs, visibilityStamp]);

  useEffect(() => {
    if (view !== "set_password") {
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
    if (view !== "login") setShowLoginPassword(false);
  }, [view]);

  useEffect(() => {
    if (view !== "loading") {
      setLoadingSlow(false);
      return;
    }
    const t = window.setTimeout(() => setLoadingSlow(true), 1000);
    return () => {
      window.clearTimeout(t);
      setLoadingSlow(false);
    };
  }, [view]);

  const sendAccessEmail = useCallback(
    async (targetEmail: string) => {
      const em = targetEmail.trim();
      if (!em || !isSupabaseConfigured || (resendCooldownEndsAt != null && Date.now() < resendCooldownEndsAt))
        return false;
      const lockCheck = await postSmartLock("check", "resend", em);
      if (lockCheck.locked) {
        setResendLockUntilMs(lockCheck.lockUntilMs ?? null);
        setResendError(lockCheck.message || SMART_LOCK_MESSAGES.wait);
        return false;
      }
      setResendLockUntilMs(null);
      setResendError(null);
      setResendBusy(true);
      setResendSentEmail(null);
      const { error: err } = await recoverySupabase.auth.resetPasswordForEmail(em, {
        redirectTo,
      });
      setResendBusy(false);
      if (err) {
        setResendLockUntilMs(null);
        await postSmartLock("fail", "resend", em);
        resendFailRef.current += 1;
        const { message, level } = resolveCalmAuthMessage("resend", resendFailRef.current, err.message);
        setResendError(message);
        setResendTier(level);
        return false;
      }
      await postSmartLock("success", "resend", em);
      await postSmartLock("success", "login", em);
      await postSmartLock("success", "email_mismatch", em);
      resendFailRef.current = 0;
      setResendTier(1);
      persistCheckoutEmail(em);
      setResendLockUntilMs(null);
      setResendSentEmail(em);
      setResendCooldownEndsAt(Date.now() + ACCESS_EMAIL_COOLDOWN_SEC * 1000);
      return true;
    },
    [redirectTo, resendCooldownEndsAt, postSmartLock]
  );

  useEffect(() => {
    const init = async () => {
      try {
        let hash = window.location.hash;
        const params = new URLSearchParams(window.location.search);

        /** Expired magic links land with #error=access_denied&error_code=otp_expired… — strip so sign-in isn’t confused. */
        if (hash && /[#&]error=/.test(hash)) {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
          );
          hash = "";
        }

        /**
         * Dev-only preview of the success screen. URL param is stripped on first init; keep a sessionStorage
         * flag so a second init (Strict Mode / effect re-run) does not fall through to getSession() and
         * immediately redirect away.
         */
        if (process.env.NODE_ENV === "development") {
          if (sessionStorage.getItem(DEV_ACCESS_SUCCESS_PREVIEW_KEY) === "1") {
            setView("success");
            return;
          }
          if (params.get("preview_success") === "1") {
            sessionStorage.setItem(DEV_ACCESS_SUCCESS_PREVIEW_KEY, "1");
            const clean = new URLSearchParams(window.location.search);
            clean.delete("preview_success");
            const qs = clean.toString();
            window.history.replaceState(
              null,
              "",
              `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`
            );
            setView("success");
            return;
          }
        }

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

        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData.session) {
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr || !userData.user) {
            await supabase.auth.signOut();
            setView("login");
            return;
          }
          setView("already_signed_in");
          return;
        }

        setView("login");
      } catch (err: unknown) {
        console.error(err);
        linkFailRef.current += 1;
        const raw = err instanceof Error ? err.message : "";
        const { message, level } = resolveCalmAuthMessage("link", linkFailRef.current, raw);
        setLinkDetailMessage(level >= 2 ? message : null);
        setLinkTier(level);
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

  /** 3s countdown on success screen (matches auto-redirect timing below). */
  useEffect(() => {
    if (view !== "success") return;
    setSuccessRedirectSeconds(3);
    const id = window.setInterval(() => {
      setSuccessRedirectSeconds((n) => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [view]);

  /** After password set: send users to platform (~3s, backup ~4.5s). Dev preview: no auto-redirect. */
  useEffect(() => {
    if (view !== "success") return;
    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined" &&
      sessionStorage.getItem(DEV_ACCESS_SUCCESS_PREVIEW_KEY) === "1"
    ) {
      return;
    }
    const go = () => {
      try {
        suppressTabSignOutForAuthNavigation();
        window.location.replace(destination);
      } catch {
        suppressTabSignOutForAuthNavigation();
        window.location.href = destination;
      }
    };
    const t1 = window.setTimeout(go, 3_000);
    const t2 = window.setTimeout(go, 4_500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [view, destination]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6 || password !== confirmPw) {
      return;
    }

    setBusy(true);
    setSetPwApiError(null);

    const { data: sessRec } = await recoverySupabase.auth.getSession();
    const recoveryAccess = sessRec.session?.access_token;
    if (recoveryAccess) {
      const validateRes = await fetch("/api/auth/validate-payment-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${recoveryAccess}` },
      });
      if (!validateRes.ok) {
        const j = (await validateRes.json().catch(() => ({}))) as { message?: string };
        setBusy(false);
        setSetPwApiError(COPY_EMAIL_MISMATCH);
        return;
      }
    }

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
        setPasswordTier(1);
        passwordFailRef.current = 0;
        return;
      }
      passwordFailRef.current += 1;
      const { message, level } = resolveCalmAuthMessage(
        "password",
        passwordFailRef.current,
        updateErr.message
      );
      setSetPwApiError(message);
      setPasswordTier(level);
      return;
    }

    passwordFailRef.current = 0;
    setPasswordTier(1);

    /** Copy recovery session into the app client so platform (cookies / shared auth) sees the user after redirect. */
    try {
      const { data: rec } = await recoverySupabase.auth.getSession();
      const s = rec.session;
      if (s?.access_token && s.refresh_token) {
        await supabase.auth.setSession({
          access_token: s.access_token,
          refresh_token: s.refresh_token,
        });
      }
    } catch {
      /* still show success + redirect; user may sign in on platform if needed */
    }

    try {
      sessionStorage.removeItem(DEV_ACCESS_SUCCESS_PREVIEW_KEY);
    } catch {
      /* ignore */
    }
    setView("success");
  }

  async function handleResendFromSetPasswordExpired() {
    setSetPwApiError(null);
    const em = setPwRecoveryEmail.trim();
    if (!em) {
      setSetPwApiError(SET_PASSWORD_EMPTY_EMAIL_FOR_RESEND);
      return;
    }
    await sendAccessEmail(em);
  }

  async function runLoginFlow(forceReplaceOtherSessions: boolean) {
    setBusy(true);
    setLoginFieldMessage(null);
    setLoginLockUntilMs(null);
    setResendSentEmail(null);
    setResendError(null);

    const trimmed = email.trim();
    if (trimmed) persistCheckoutEmail(trimmed);

    try {
      const lockLogin = await postSmartLock("check", "login", trimmed);
      if (lockLogin.locked) {
        setLoginLockUntilMs(lockLogin.lockUntilMs ?? null);
        setLoginFieldMessage(lockLogin.message || SMART_LOCK_MESSAGES.wait);
        return;
      }

      if (!forceReplaceOtherSessions) {
        const existsRes = await fetch("/api/auth/user-exists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        if (existsRes.status === 429) {
          setLoginLockUntilMs(null);
          setLoginFieldMessage(RATE_LIMIT_MESSAGE);
          return;
        }
        const existsJson = (await existsRes.json().catch(() => ({}))) as {
          auth_user_exists?: boolean;
          billing_email_registered?: boolean;
        };
        const authOk = !!existsJson.auth_user_exists;
        const billingOk = !!existsJson.billing_email_registered;

        if (!authOk && billingOk) {
          setLoginLockUntilMs(null);
          setLoginFieldMessage(SETUP_PASSWORD_FIRST_MESSAGE);
          return;
        }
        if (!authOk && !billingOk) {
          setLoginLockUntilMs(null);
          setLoginFieldMessage(NO_PURCHASE_MESSAGE);
          return;
        }

        const otherRes = await fetch("/api/auth/other-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        if (otherRes.status === 429) {
          setLoginLockUntilMs(null);
          setLoginFieldMessage(RATE_LIMIT_MESSAGE);
          return;
        }
        const otherJson = (await otherRes.json().catch(() => ({}))) as { hasOtherSessions?: boolean };
        if (otherJson.hasOtherSessions) {
          setSessionConflictOpen(true);
          return;
        }
      }

      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password: loginPw,
      });

      if (signErr) {
        const fl = await postSmartLock("fail", "login", trimmed);
        loginFailRef.current += 1;
        if ((fl.failures ?? 0) >= 10) {
          setLoginLockUntilMs(null);
          setLoginFieldMessage(COPY_CHECKING_ACCESS_SHORTLY);
          return;
        }
        if (fl.locked) {
          setLoginLockUntilMs(fl.lockUntilMs ?? null);
          setLoginFieldMessage(fl.message || SMART_LOCK_MESSAGES.wait);
          return;
        }
        setLoginLockUntilMs(null);
        const { message } = resolveLoginCalmAuthMessage(loginFailRef.current, signErr.message);
        setLoginFieldMessage(message);
        return;
      }

      loginFailRef.current = 0;

      const { data: sessWrap } = await supabase.auth.getSession();
      const accessToken = sessWrap.session?.access_token;
      if (accessToken) {
        const completeRes = await fetch("/api/auth/complete-login", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const completeJson = (await completeRes.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        if (!completeRes.ok) {
          if (completeRes.status === 429) {
            setLoginLockUntilMs(null);
            setLoginFieldMessage(completeJson.message ?? RATE_LIMIT_MESSAGE);
            return;
          }
          if (completeRes.status === 403 && completeJson.error === "email_mismatch") {
            const failJson = await postSmartLock("fail", "email_mismatch", trimmed);
            await fetch("/api/auth/clear-active-session", {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
            }).catch(() => {});
            await supabase.auth.signOut();
            setEmailMismatchShowTryOther((failJson.failures ?? 0) >= 2);
            if (failJson.locked) {
              setLoginLockUntilMs(failJson.lockUntilMs ?? null);
              setLoginFieldMessage(failJson.message || SMART_LOCK_MESSAGES.wait);
            } else {
              setLoginLockUntilMs(null);
              if ((failJson.failures ?? 0) >= 2) {
                setLoginFieldMessage(COPY_EMAIL_MISMATCH_AFTER_TWO);
              } else {
                setLoginFieldMessage(COPY_EMAIL_MISMATCH);
              }
            }
            return;
          }
          setLoginLockUntilMs(null);
          setLoginFieldMessage(
            completeJson.error === "membership_ensure_failed" || completeRes.status >= 500
              ? MEMBERSHIP_PENDING_MESSAGE
              : completeJson.message || MEMBERSHIP_PENDING_MESSAGE
          );
          return;
        }
        await postSmartLock("success", "login", trimmed);
      }

      setSessionConflictOpen(false);
      suppressTabSignOutForAuthNavigation();
      window.location.href = appendAllSetParam(destination);
    } finally {
      setBusy(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    void runLoginFlow(false);
  }

  async function handleResendFromLogin() {
    setLoginFieldMessage(null);
    setLoginLockUntilMs(null);
    if (!email.trim()) {
      setLoginFieldMessage(LOGIN_PROMPT_THEN_NEW_LINK);
      return;
    }
    await sendAccessEmail(email);
  }

  async function handleResendFromErrorScreen() {
    setResendError(null);
    if (!errorScreenEmail.trim()) {
      setResendError(FORM_EMPTY_EMAIL);
      return;
    }
    await sendAccessEmail(errorScreenEmail);
  }

  if (view === "loading") {
    return (
      <div className="cb-auth-shell">
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
          membershipVerifyFailed={membershipVerifyFailed}
        />
        <main className="cb-auth-main bg-cb-green">
          <p className="text-sm text-white sm:text-base">One moment…</p>
          {loadingSlow ? (
            <div className="mt-4 flex justify-center" role="status" aria-busy="true">
              <span
                className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden
              />
            </div>
          ) : null}
        </main>
      </div>
    );
  }

  if (view === "already_signed_in") {
    return (
      <div className="cb-auth-shell">
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
          membershipVerifyFailed={membershipVerifyFailed}
        />
        <main className="cb-auth-main bg-cb-green">
          <div className="cb-card max-w-md w-full text-center">
            <p className="text-sm text-cb-green sm:text-base">{COPY_ALREADY_SIGNED_IN}</p>
            <button
              type="button"
              className="cb-btn-primary mt-6 w-full font-semibold"
              onClick={() => {
                suppressTabSignOutForAuthNavigation();
                window.location.href = appendAllSetParam(destination);
              }}
            >
              {COPY_CONTINUE}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (view === "success") {
    return (
      <div className="cb-auth-shell">
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
          membershipVerifyFailed={membershipVerifyFailed}
        />
        <main className="cb-auth-main bg-cb-green">
          <div className="cb-card max-w-md w-full text-center">
            <div className="inline-block rounded-md border border-cb-green/15 bg-cb-green/[0.06] px-4 py-2 text-sm font-medium text-cb-green">
              {COPY_YOURE_ALL_SET}
            </div>
            {successRedirectSeconds > 0 ? (
              <p className="mt-4 text-sm leading-relaxed text-cb-green/85 sm:text-base">
                If you aren&apos;t logged into your account automatically in{" "}
                <span className="font-semibold tabular-nums text-cb-green">{successRedirectSeconds}</span> seconds, click{" "}
                <span className="font-semibold text-cb-green">Continue to Dashboard</span> below to log into your account.
              </p>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-cb-green/85 sm:text-base">
                Still on this page? Click continue to dashboard below to log into your account.
              </p>
            )}
            <a
              href={destination}
              className="cb-btn-primary mt-6 inline-block w-full max-w-xs text-center font-semibold no-underline"
              onClick={() => {
                suppressTabSignOutForAuthNavigation();
                try {
                  sessionStorage.removeItem(DEV_ACCESS_SUCCESS_PREVIEW_KEY);
                } catch {
                  /* ignore */
                }
              }}
            >
              Continue to Dashboard
            </a>
          </div>
        </main>
      </div>
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
      <div className="cb-auth-shell">
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
          membershipVerifyFailed={membershipVerifyFailed}
        />
        <main className="cb-auth-main bg-cb-green">
          <div className="cb-card max-w-md w-full">
            {setPasswordLinkExpired ? (
              <>
                <h1 className="cb-card-title text-center">{SET_PASSWORD_EXPIRED_TITLE}</h1>
                <p className="cb-card-subtitle mt-2 text-center">{SET_PASSWORD_EXPIRED_SUB}</p>
                {looksLikeEmail(setPwRecoveryEmail) && (
                  <>
                    <PaymentTargetEmailLine
                      email={formatDisplayEmail(setPwRecoveryEmail)}
                      variant={resendSentEmail ? "sent" : "pending"}
                      className="mt-3 text-center"
                    />
                    <RegisteredEmailChangeForm billId={null} showSupportHint={false} />
                  </>
                )}
                {resendSentEmail && (
                  <div className="mt-4 space-y-1 rounded-lg bg-cb-green/10 px-3 py-2 text-sm font-medium text-cb-green">
                    <p>{`Email sent to ${formatDisplayEmail(resendSentEmail)}`}</p>
                    {resendCooldownSec > 0 ? <p>{accessEmailResendCooldownLabel(resendCooldownSec)}</p> : null}
                  </div>
                )}
                {resendError && (
                  <div className={`${calmNoticeClass} mt-3`}>
                    <CalmAuthMessage text={resendError} className="text-sm leading-relaxed text-cb-green" />
                  </div>
                )}
                {setPwApiError && (
                  <div className={`${calmNoticeClass} mt-3`}>
                    <CalmAuthMessage text={setPwApiError} className="text-sm leading-relaxed text-cb-green" />
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-2.5 text-left sm:mt-6 sm:gap-3">
                  <label className="block text-left text-sm font-medium text-cb-green">{ACCESS_EMAIL_FIELD_LABEL}</label>
                  <input
                    className="cb-input"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={setPwRecoveryEmail}
                    onChange={(e) => {
                      setSetPwRecoveryEmail(e.target.value);
                      setResendSentEmail(null);
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
                    className="cb-btn-primary mt-2 w-full font-semibold"
                    disabled={
                      resendBusy || resendCooldownSec > 0 || !setPwRecoveryEmail.trim() || !isSupabaseConfigured
                    }
                    onClick={() => void handleResendFromSetPasswordExpired()}
                  >
                    {resendBusy || resendCooldownSec > 0
                      ? accessEmailResendButtonLabel(resendCooldownSec, resendBusy)
                      : COPY_RESEND_ACCESS_LINK}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="cb-card-title text-center">Set Your Password</h1>
                <p className="cb-card-subtitle mt-3 text-center">{COPY_FINISH_PASSWORD}</p>

                {setPwApiError && (
                  <div className={`${calmNoticeClass} mt-4`}>
                    <CalmAuthMessage text={setPwApiError} className="text-sm leading-relaxed text-cb-green" />
                  </div>
                )}

                <form onSubmit={handleSetPassword} className="mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-5">
                  <p className="text-sm leading-relaxed text-cb-green/85">{PASSWORD_REQUIREMENTS_COPY}</p>

                  <div className="flex flex-col gap-1.5">
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
                      <p id="pw-length-err" className="text-sm text-cb-green">
                        {FORM_PASSWORD_TOO_SHORT}
                      </p>
                    )}
                    {lengthOk && (
                      <p className="text-xs font-medium text-cb-green">✓ At least 6 characters</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
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
                      <p id="pw-match-err" className="text-sm text-cb-green">
                        {FORM_PASSWORD_MISMATCH}
                      </p>
                    )}
                    {passwordsMatch && (
                      <p className="text-xs font-medium text-cb-green">✓ Passwords match</p>
                    )}
                  </div>

                  <button
                    className="cb-btn-primary mt-2 w-full font-semibold"
                    type="submit"
                    disabled={passwordSubmitDisabled}
                  >
                    {busy ? PASSWORD_BUTTON_LOADING : PASSWORD_BUTTON}
                  </button>
                  {busy && longActionFeedback ? (
                    <div className="mt-2 flex justify-center" role="status" aria-busy="true">
                      <span
                        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-cb-green/25 border-t-cb-green"
                        aria-hidden
                      />
                    </div>
                  ) : null}
                  {showDisabledHelper && (
                    <p className="text-center text-sm text-cb-green/75">{FORM_COMPLETE_TO_CONTINUE}</p>
                  )}
                </form>
              </>
            )}
            <div className="mt-5 border-t border-cb-gold/30 pt-4 sm:mt-8 sm:pt-6">
              <CalmAuthMessage text={ACCESS_SUPPORT_HINT} className="text-center text-sm font-normal leading-relaxed text-cb-green/55" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === "login") {
    const loginDisabled = busy || !email.trim() || !loginPw;

    return (
      <div className="cb-auth-shell">
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
          membershipVerifyFailed={membershipVerifyFailed}
        />
        <main className="cb-auth-main bg-cb-green">
          <div className="cb-card max-w-md w-full">
            <h1 className="cb-card-title text-center">Welcome Back</h1>
            <p className="cb-card-subtitle mt-2 text-center">
              Enter your email and password to continue.
            </p>

            {loginFieldMessage && (
              <div className={`${calmNoticeClass} mt-4`}>
                <CalmAuthMessage text={loginFieldMessage} className="text-sm leading-relaxed text-cb-green" />
              </div>
            )}
            {emailMismatchShowTryOther && (
              <button
                type="button"
                className="cb-btn-secondary mt-3 w-full font-semibold"
                onClick={() => {
                  loginEmailInputRef.current?.focus();
                  loginEmailInputRef.current?.select();
                }}
              >
                {COPY_TRY_ANOTHER_EMAIL}
              </button>
            )}
            {resendSentEmail && (
              <div className="mt-3 space-y-1 rounded-lg bg-cb-green/10 px-3 py-2 text-center text-sm font-normal leading-relaxed text-cb-green">
                <p>{`Email sent to ${formatDisplayEmail(resendSentEmail)}`}</p>
                {resendCooldownSec > 0 ? <p>{accessEmailResendCooldownLabel(resendCooldownSec)}</p> : null}
              </div>
            )}
            {resendError && (
              <div className={`${calmNoticeClass} mt-3`}>
                <CalmAuthMessage text={resendError} className="text-sm leading-relaxed text-cb-green" />
              </div>
            )}

            {sessionConflictOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="session-conflict-title"
              >
                <div className="cb-card w-full max-w-md p-4 sm:p-6">
                  <h2 id="session-conflict-title" className="cb-card-title text-center text-base sm:text-lg">
                    You&apos;re signed in on another device
                  </h2>
                  <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="cb-btn-quiet w-full sm:w-auto"
                      onClick={() => setSessionConflictOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="cb-btn-primary w-full sm:w-auto"
                      onClick={() => void runLoginFlow(true)}
                    >
                      Log out other session and continue
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-5 flex flex-col sm:mt-8">
              <div className="flex flex-col gap-3 sm:gap-4">
                <input
                  className="cb-input"
                  type="email"
                  placeholder={ACCESS_EMAIL_PLACEHOLDER}
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLoginFieldMessage(null);
                    setLoginLockUntilMs(null);
                    setResendSentEmail(null);
                    setResendError(null);
                    setSessionConflictOpen(false);
                    setEmailMismatchShowTryOther(false);
                  }}
                  ref={loginEmailInputRef}
                  onBlur={() => {
                    const t = email.trim();
                    if (t.includes("@")) persistCheckoutEmail(t);
                  }}
                />

                <div className="flex flex-col gap-1.5">
                  <PasswordInputWithToggle
                    value={loginPw}
                    onChange={setLoginPw}
                    placeholder={PASSWORD_PLACEHOLDER}
                    autoComplete="current-password"
                    visible={showLoginPassword}
                    onToggleVisible={() => setShowLoginPassword((s) => !s)}
                  />
                  <p className="text-sm leading-relaxed text-cb-green/85">
                    {resendBusy ? (
                      <span>{ACCESS_EMAIL_SENDING_LABEL}</span>
                    ) : resendCooldownSec > 0 ? (
                      <span className="text-cb-green/70">{accessEmailResendCooldownLabel(resendCooldownSec)}</span>
                    ) : (
                      <button
                        type="button"
                        className="cb-link p-0 text-left text-sm font-medium underline decoration-cb-gold-dark/60 underline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-45 disabled:no-underline"
                        disabled={!email.trim() || !isSupabaseConfigured}
                        onClick={() => void handleResendFromLogin()}
                      >
                        Reset Password
                      </button>
                    )}
                  </p>
                </div>
              </div>

              <button
                className="cb-btn-primary mt-5 w-full font-semibold sm:mt-8"
                type="submit"
                disabled={loginDisabled}
              >
                {busy ? "Signing in…" : "Login"}
              </button>
              {(busy || resendBusy) && longActionFeedback ? (
                <div className="mt-3 flex justify-center" role="status" aria-busy="true">
                  <span
                    className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-cb-green/25 border-t-cb-green"
                    aria-hidden
                  />
                </div>
              ) : null}
            </form>

            <div className="mt-6 border-t border-cb-gold/30 pt-5 sm:mt-10 sm:pt-8">
              <p className="text-center text-sm leading-relaxed text-cb-green/75">
                Don&apos;t have access yet?
              </p>
              <div className="mt-2 flex w-full justify-center sm:mt-3">
                <button
                  type="button"
                  className="cb-btn-auth-view-plans !w-auto max-w-[min(100%,14rem)] px-3 sm:max-w-[14rem] sm:px-5"
                  onClick={() => {
                    window.location.href = "/pricing";
                  }}
                >
                  View Available Plans
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-cb-gold/30 pt-4 sm:mt-8 sm:pt-6">
              <CalmAuthMessage text={ACCESS_SUPPORT_HINT} className="text-center text-sm font-normal leading-relaxed text-cb-green/55" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === "error") {
    return (
      <div className="cb-auth-shell">
        <PlatformAccessNotice
          membershipInactive={membershipInactive}
          sessionCleared={sessionCleared}
          membershipVerifyFailed={membershipVerifyFailed}
        />
        <main className="cb-auth-main bg-cb-green">
          <div className="cb-card max-w-md w-full text-center">
            <h1 className="cb-card-title">{ACCESS_ERROR_PAGE_TITLE}</h1>
            {linkDetailMessage && (
              <div className={`${calmNoticeClass} mt-3 text-left`}>
                <CalmAuthMessage text={linkDetailMessage} className="text-sm leading-relaxed text-cb-green" />
              </div>
            )}
            {ACCESS_ERROR_PAGE_SUBTITLE ? (
              <p className="mt-3 text-sm leading-relaxed text-cb-green/90">{ACCESS_ERROR_PAGE_SUBTITLE}</p>
            ) : null}

            {looksLikeEmail(errorScreenEmail) && (
              <>
                <PaymentTargetEmailLine
                  email={formatDisplayEmail(errorScreenEmail)}
                  variant={resendSentEmail ? "sent" : "pending"}
                  className="mt-3 text-center"
                />
                <RegisteredEmailChangeForm billId={null} showSupportHint={false} />
              </>
            )}

            <div className="mt-5 flex flex-col gap-3 text-left sm:mt-8 sm:gap-4">
              <label className="block text-left text-sm font-medium text-cb-green">{ACCESS_EMAIL_FIELD_LABEL}</label>
              <input
                className="cb-input"
                type="email"
                placeholder={ACCESS_EMAIL_PLACEHOLDER}
                autoComplete="email"
                value={errorScreenEmail}
                onChange={(e) => {
                  setErrorScreenEmail(e.target.value);
                  setResendSentEmail(null);
                  setResendError(null);
                }}
                onBlur={() => {
                  const t = errorScreenEmail.trim();
                  if (t.includes("@")) persistCheckoutEmail(t);
                }}
              />
              {resendSentEmail && (
                <div className="space-y-1 rounded-lg bg-cb-green/10 px-3 py-2 text-sm font-medium text-cb-green">
                  <p>{`Email sent to ${formatDisplayEmail(resendSentEmail)}`}</p>
                  {resendCooldownSec > 0 ? <p>{accessEmailResendCooldownLabel(resendCooldownSec)}</p> : null}
                </div>
              )}
              {resendError && (
                <div className={calmNoticeClass}>
                  <CalmAuthMessage text={resendError} className="text-sm leading-relaxed text-cb-green" />
                </div>
              )}
            </div>

            <RecoveryActions
              className="mt-4 sm:mt-6"
              onSendNewLink={() => void handleResendFromErrorScreen()}
              sendLinkLabel={accessEmailResendButtonLabel(resendCooldownSec, resendBusy)}
              disabled={resendBusy || resendCooldownSec > 0 || !errorScreenEmail.trim() || !isSupabaseConfigured}
            />

            <div className="mt-5 border-t border-cb-gold/30 pt-4 sm:mt-8 sm:pt-6">
              <CalmAuthMessage text={ACCESS_SUPPORT_HINT} className="text-center text-sm font-normal leading-relaxed text-cb-green/55" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default function AccessPage() {
  return (
    <Suspense
      fallback={
        <main className="cb-auth-main bg-cb-green">
          <p className="text-sm text-white/90">Loading…</p>
        </main>
      }
    >
      <AccessInner />
    </Suspense>
  );
}
