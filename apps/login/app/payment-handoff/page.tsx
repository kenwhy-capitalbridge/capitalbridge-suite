"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAccessRedirectUrlForAuthEmails } from "@/lib/authEmailRedirect";
import { isSupabaseConfigured, recoverySupabase } from "@/lib/supabaseClient";
import {
  ACCESS_EMAIL_COOLDOWN_SEC,
  ACCESS_EMAIL_SENT_MESSAGE,
  ACCESS_EMAIL_SENDING_LABEL,
  accessEmailResendButtonLabel,
} from "@/lib/resendAccessEmail";
import { buildAccessUrl, persistCheckoutEmail } from "@/lib/checkoutEmailPersistence";

type BillingStatusResponse = {
  mode?: string;
  bill_id?: string;
  email?: string | null;
  billing_status?: string | null;
  pending_bill_id?: string | null;
  account_ready?: boolean;
  membership_ready?: boolean;
  next_step?: string;
  error?: string;
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial (7 Days)",
  monthly: "Monthly (30 Days)",
  quarterly: "Quarterly (90 Days)",
  yearly_full: "Strategic (365 Days)",
  strategic: "Strategic Execution (365 Days)",
};

const platformBase =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLATFORM_APP_URL : undefined) ??
  "https://platform.thecapitalbridge.com";
const LOGIN_REDIRECT = platformBase.replace(/\/$/, "");

const btnPrimary =
  "w-full rounded-xl bg-cb-gold px-4 py-3.5 text-center text-base font-semibold text-cb-green shadow-lg transition hover:scale-[1.02] hover:bg-cb-green hover:text-white disabled:opacity-50 block";
const btnSecondary =
  "w-full rounded-xl border-2 border-cb-gold/50 bg-white/90 px-4 py-3 text-center font-medium text-cb-green transition hover:scale-[1.02] block";

function openWebInbox(email: string | null | undefined) {
  const domain = email?.split("@")[1]?.toLowerCase().trim() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") {
    window.open("https://mail.google.com/mail/u/0/#inbox", "_blank", "noopener,noreferrer");
    return;
  }
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) {
    window.open("https://outlook.live.com/mail/", "_blank", "noopener,noreferrer");
    return;
  }
  window.open("https://mail.google.com/mail/u/0/#inbox", "_blank", "noopener,noreferrer");
}

function setPasswordPrimaryLabel(busy: boolean, cooldownSec: number): string {
  if (busy) return ACCESS_EMAIL_SENDING_LABEL;
  if (cooldownSec > 0) return `Resend in ${cooldownSec}s`;
  return "Set your password";
}

function PaymentHandoffContent() {
  const searchParams = useSearchParams();
  const paymentUrl = searchParams.get("payment_url");
  const billId = searchParams.get("bill_id");
  const plan = searchParams.get("plan") ?? "trial";
  const planLabel = PLAN_LABELS[plan] ?? plan;

  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(!!billId);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const redirectTo = useMemo(() => getAccessRedirectUrlForAuthEmails(), []);

  const accessHref = useMemo(
    () => buildAccessUrl({ redirectTo: LOGIN_REDIRECT, email: status?.email?.trim() ?? undefined }),
    [status?.email]
  );

  useEffect(() => {
    if (!billId) return;

    let cancelled = false;

    async function pollStatus() {
      if (!billId) return;
      try {
        const res = await fetch(`/api/billing/status?bill_id=${encodeURIComponent(billId)}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as BillingStatusResponse;
        if (!cancelled) {
          setStatus(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [billId]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const accountReady = !!status?.account_ready;
  const statusEmail = status?.email?.trim() ?? null;
  const sendDisabled = resendBusy || resendCooldown > 0 || !statusEmail || !isSupabaseConfigured;

  useEffect(() => {
    if (statusEmail) persistCheckoutEmail(statusEmail);
  }, [statusEmail]);

  const handleSendSetPasswordEmail = useCallback(async () => {
    setResendError(null);
    const em = statusEmail;
    if (!em) {
      setResendError("We don't have your email on this screen. Use the same inbox you entered at checkout.");
      return;
    }
    if (!isSupabaseConfigured) {
      setResendError("Sign-in isn’t configured in this environment.");
      return;
    }
    if (resendCooldown > 0 || resendBusy) return;

    setResendBusy(true);
    const { error } = await recoverySupabase.auth.resetPasswordForEmail(em, {
      redirectTo,
    });
    setResendBusy(false);
    if (error) {
      setResendSuccess(null);
      setResendError(error.message);
      return;
    }
    persistCheckoutEmail(em);
    setResendSuccess(ACCESS_EMAIL_SENT_MESSAGE);
    setResendCooldown(ACCESS_EMAIL_COOLDOWN_SEC);
  }, [redirectTo, statusEmail, resendCooldown, resendBusy]);

  if (accountReady) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Your account is ready.</h1>
          <p className="cb-card-subtitle mt-3 text-base leading-relaxed">
            We&apos;ve emailed you a link to set your password. Open it on this device to finish.
          </p>
          {billId && <p className="mt-4 text-xs text-cb-green/60">Reference: {billId}</p>}
          {statusEmail ? (
            <>
              {resendSuccess && (
                <p className="mt-4 rounded-lg bg-cb-green/10 px-3 py-2 text-sm font-medium text-cb-green">{resendSuccess}</p>
              )}
              {resendError && <p className="cb-message-error mt-3 text-left text-sm">{resendError}</p>}
              <div className="mt-8 flex w-full flex-col gap-3">
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={sendDisabled}
                  onClick={() => void handleSendSetPasswordEmail()}
                >
                  {setPasswordPrimaryLabel(resendBusy, resendCooldown)}
                </button>
                <p className="text-sm leading-relaxed text-cb-green/85">
                  Didn&apos;t get the email? Use Send password link again after the timer.
                </p>
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={sendDisabled}
                  onClick={() => void handleSendSetPasswordEmail()}
                >
                  {accessEmailResendButtonLabel(resendCooldown, resendBusy)}
                </button>
                <button type="button" className={btnSecondary} onClick={() => openWebInbox(statusEmail)}>
                  Open email inbox
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-cb-green/85">
              Go to{" "}
              <a href="/access" className="font-semibold underline">
                account access
              </a>{" "}
              and use Send password link again with the address you used at checkout.
            </p>
          )}
          <div className="mt-6 flex w-full flex-col items-center gap-3">
            <button type="button" className={btnSecondary} onClick={() => { window.location.href = accessHref; }}>
              Continue to set your password
            </button>
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
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card max-w-md">
        <h1 className="cb-card-title">Continue to payment</h1>
        <p className="cb-card-subtitle">Plan: {planLabel}</p>

        <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem", fontSize: "0.92rem", opacity: 0.9 }}>
          {billId && <p>Reference: {billId}</p>}
        </div>

        <div style={{ marginTop: "1.25rem", display: "grid", gap: "0.9rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
          {loading && <p className="font-medium text-cb-green">Securing your access…</p>}
          {!loading && (
            <p>
              Open payment in a new tab. After you pay, we&apos;ll email you a link to set your password — you won&apos;t need to
              sign in until then.
            </p>
          )}
        </div>

        <div style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
          {paymentUrl && (
            <a className={btnPrimary} href={paymentUrl} target="_blank" rel="noreferrer">
              Open secure payment
            </a>
          )}
          {billId && (
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                window.location.href = `/payment-return?billplz[id]=${encodeURIComponent(billId)}`;
              }}
            >
              I already paid
            </button>
          )}
          <button
            type="button"
            className="cb-btn-auth-view-plans mx-auto max-w-[12rem]"
            onClick={() => {
              window.location.href = "/pricing";
            }}
          >
            View plans
          </button>
        </div>
      </div>
    </main>
  );
}

export default function PaymentHandoffPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
          <div className="cb-card max-w-md text-center">
            <h1 className="cb-card-title">Securing your access…</h1>
            <p className="cb-card-subtitle mt-2">Loading…</p>
          </div>
        </main>
      }
    >
      <PaymentHandoffContent />
    </Suspense>
  );
}
