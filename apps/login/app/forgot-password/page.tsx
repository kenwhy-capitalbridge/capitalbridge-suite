"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured, recoverySupabase } from "@/lib/supabaseClient";
import { getAccessRedirectUrlForAuthEmails } from "@/lib/authEmailRedirect";
import {
  ACCESS_EMAIL_COOLDOWN_SEC,
  ACCESS_EMAIL_SENT_MESSAGE,
  ACCESS_EMAIL_SENDING_LABEL,
  accessEmailResendButtonLabel,
} from "@/lib/resendAccessEmail";
import { persistCheckoutEmail, readPersistedCheckoutEmail } from "@/lib/checkoutEmailPersistence";

const btnBase =
  "w-full rounded-xl px-4 py-3 font-medium transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100";
const btnPrimary = `${btnBase} cb-btn-primary`;
const btnSecondary = `${btnBase} cb-btn-secondary`;

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const hydrated = useRef(false);

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
    setError(null);
    if (cooldown > 0 || loading) return false;

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email.");
      return false;
    }

    setLoading(true);
    const redirectTo = getAccessRedirectUrlForAuthEmails();
    const { error: resetError } = await recoverySupabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return false;
    }
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
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Check your email</h1>
          <p className="cb-card-subtitle mt-2">{ACCESS_EMAIL_SENT_MESSAGE}</p>
          <p className="mt-2 text-sm text-cb-green/80">
            If an account exists for <strong>{email}</strong>, open the link to set your password — same email we send after
            checkout.
          </p>
          {error && <p className="cb-message-error mt-3 text-sm">{error}</p>}
          <button
            type="button"
            className={`${btnSecondary} mt-6`}
            disabled={loading || cooldown > 0 || !isSupabaseConfigured}
            onClick={() => void handleResendFromSuccess()}
          >
            {accessEmailResendButtonLabel(cooldown, loading)}
          </button>
          <button type="button" className={`${btnPrimary} mt-3`} onClick={() => { window.location.href = "/access"; }}>
            Back to account access
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card max-w-md">
        <h1 className="cb-card-title">Forgot password?</h1>
        <p className="cb-card-subtitle">
          Enter your email — we&apos;ll send a link to set your password. This is the same link as{" "}
          <strong>Send password link again</strong> on the sign-in page.
        </p>

        {!isSupabaseConfigured && (
          <p className="cb-message-error" style={{ marginTop: "1rem" }}>
            Sign-in isn&apos;t configured for this environment.
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: "1.75rem", display: "grid", gap: "1rem" }}>
          {error && <p className="cb-message-error">{error}</p>}

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Email</span>
            <input
              className="cb-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => {
                const t = email.trim();
                if (t.includes("@")) persistCheckoutEmail(t);
              }}
              type="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <button className={btnPrimary} type="submit" disabled={loading || !isSupabaseConfigured}>
            {loading ? ACCESS_EMAIL_SENDING_LABEL : "Send password link"}
          </button>
        </form>

        <button type="button" className={`${btnSecondary} mt-4`} onClick={() => { window.location.href = "/access"; }}>
          Back to account access
        </button>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
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
