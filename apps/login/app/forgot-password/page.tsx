"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured, recoverySupabase } from "@/lib/supabaseClient";
import { getAccessRedirectUrlForAuthEmails } from "@/lib/authEmailRedirect";
import {
  ACCESS_EMAIL_COOLDOWN_SEC,
  ACCESS_EMAIL_SENT_MESSAGE,
  ACCESS_EMAIL_SENDING_LABEL,
} from "@/lib/resendAccessEmail";
import { persistCheckoutEmail, readPersistedCheckoutEmail } from "@/lib/checkoutEmailPersistence";
import { ButtonSpinner } from "@/components/ButtonSpinner";
import { CalmAuthMessage } from "@/components/CalmAuthMessage";
import { NavAssignButton } from "@/components/NavAssignButton";
import {
  ACCESS_EMAIL_FIELD_LABEL,
  ACCESS_PRIMARY_CTA,
  ACCESS_SUPPORT_HINT,
  DEV_PREVIEW_NO_EMAIL,
  FORM_EMPTY_EMAIL,
  resolveCalmAuthMessage,
} from "@/lib/sanitizeAuthErrorMessage";

const btnPrimary =
  "cb-btn-primary w-full font-semibold transition hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100";

const calmNoticeClass =
  "rounded-lg border border-amber-200/80 bg-amber-50/95 px-2.5 py-1.5 text-sm text-cb-green sm:px-3 sm:py-2";

/** Forgot-password page — primary action label separate from Account Access resend. */
function forgotPasswordActionLabel(cooldownSec: number, busy: boolean): string {
  if (busy) return ACCESS_EMAIL_SENDING_LABEL;
  if (cooldownSec > 0) return `Wait ${cooldownSec}s, then try again`;
  return "Reset Password";
}

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const hydrated = useRef(false);
  const resendFailRef = useRef(0);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const q = searchParams.get("email")?.trim();
    const stored = readPersistedCheckoutEmail();
    const next = q || stored || "";
    if (next) setEmail(next);
  }, [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function sendPasswordLink() {
    setFormMessage(null);
    if (cooldown > 0 || loading) return false;

    const trimmed = email.trim();
    if (!trimmed) {
      setFormMessage(FORM_EMPTY_EMAIL);
      return false;
    }

    setLoading(true);
    const redirectTo = getAccessRedirectUrlForAuthEmails();
    const { error: resetError } = await recoverySupabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });
    setLoading(false);

    if (resetError) {
      resendFailRef.current += 1;
      const { message } = resolveCalmAuthMessage("resend", resendFailRef.current, resetError.message);
      setFormMessage(message);
      return false;
    }
    resendFailRef.current = 0;
    persistCheckoutEmail(trimmed);
    setCooldown(ACCESS_EMAIL_COOLDOWN_SEC);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await sendPasswordLink();
    if (ok) setSuccess(true);
  }

  async function handleResendFromSuccess() {
    await sendPasswordLink();
  }

  if (success) {
    return (
      <main className="cb-auth-main">
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Check your email</h1>
          <p className="cb-card-subtitle mt-2">{ACCESS_EMAIL_SENT_MESSAGE}</p>
          <p className="mt-2 text-sm text-cb-green/80">
            If an account exists for <strong>{email}</strong>, open the link to set your password — same link we send after
            checkout.
          </p>
          {formMessage && (
            <div className={`${calmNoticeClass} mt-3 text-left`}>
              <CalmAuthMessage text={formMessage} className="text-sm leading-relaxed text-cb-green" />
            </div>
          )}
          <button
            type="button"
            className={`${btnPrimary} mt-8`}
            disabled={loading || cooldown > 0 || !isSupabaseConfigured}
            onClick={() => void handleResendFromSuccess()}
          >
            {forgotPasswordActionLabel(cooldown, loading)}
          </button>
          <button
            type="button"
            className="cb-btn-quiet mt-4"
            onClick={() => {
              window.location.href = "/access";
            }}
          >
            {ACCESS_PRIMARY_CTA}
          </button>
          <div className="mt-8 border-t border-cb-gold/30 pt-6">
            <CalmAuthMessage text={ACCESS_SUPPORT_HINT} className="text-center text-sm font-normal leading-relaxed text-cb-green/55" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cb-auth-main">
      <div className="cb-card max-w-md">
        <h1 className="cb-card-title">Forgot Your Password?</h1>
        <p className="cb-card-subtitle">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>

        {!isSupabaseConfigured && (
          <div className={`${calmNoticeClass} mt-4`}>
            <CalmAuthMessage text={DEV_PREVIEW_NO_EMAIL} className="text-sm leading-relaxed text-cb-green" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          {formMessage && (
            <div className={calmNoticeClass}>
              <CalmAuthMessage text={formMessage} className="text-sm leading-relaxed text-cb-green" />
            </div>
          )}

          <label className="grid gap-1.5 text-left">
            <span className="text-sm font-medium text-cb-green">{ACCESS_EMAIL_FIELD_LABEL}</span>
            <input
              className="cb-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFormMessage(null);
              }}
              onBlur={() => {
                const t = email.trim();
                if (t.includes("@")) persistCheckoutEmail(t);
              }}
              type="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <button
            className={btnPrimary}
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            aria-busy={loading}
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <ButtonSpinner className="border-cb-green/35 border-t-cb-green" />
                {forgotPasswordActionLabel(0, loading)}
              </span>
            ) : (
              forgotPasswordActionLabel(0, loading)
            )}
          </button>
        </form>

        <NavAssignButton href="/access" className="cb-btn-quiet mt-8" loadingLabel="Loading…">
          {ACCESS_PRIMARY_CTA}
        </NavAssignButton>

        <div className="mt-8 border-t border-cb-gold/30 pt-6">
          <CalmAuthMessage text={ACCESS_SUPPORT_HINT} className="text-center text-sm font-normal leading-relaxed text-cb-green/55" />
        </div>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="cb-auth-main">
          <div className="cb-card max-w-md text-center">
            <h1 className="cb-card-title">Loading…</h1>
          </div>
        </main>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
