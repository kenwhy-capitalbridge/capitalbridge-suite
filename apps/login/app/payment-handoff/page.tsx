"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  ACCESS_EMAIL_COOLDOWN_SEC,
  ACCESS_EMAIL_SENDING_LABEL,
} from "@/lib/resendAccessEmail";
import { buildAccessUrl, persistCheckoutEmail } from "@/lib/checkoutEmailPersistence";
import { PaymentTargetEmailLine } from "@/components/PaymentTargetEmailCopy";

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

function sendPasswordSetupPrimaryLabel(busy: boolean, cooldownSec: number): string {
  if (busy) return ACCESS_EMAIL_SENDING_LABEL;
  if (cooldownSec > 0) return `Resend in ${cooldownSec}s`;
  return "Send Password Setup Email";
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

  const accessHref = useMemo(
    () => buildAccessUrl({ redirectTo: LOGIN_REDIRECT, email: status?.email?.trim() ?? undefined }),
    [status?.email]
  );

  const fetchStatusOnce = useCallback(async () => {
    if (!billId) return;
    try {
      const res = await fetch(`/api/billing/status?bill_id=${encodeURIComponent(billId)}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as BillingStatusResponse;
      setStatus(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [billId]);

  /** Single fetch on mount — no interval (aligns with payment-return: user triggers refresh if needed). */
  useEffect(() => {
    if (!billId) return;
    void fetchStatusOnce();
  }, [billId, fetchStatusOnce]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const accountReady = !!status?.account_ready;
  const statusEmail = status?.email?.trim() ?? null;
  const sendDisabled =
    resendBusy ||
    resendCooldown > 0 ||
    !isSupabaseConfigured ||
    !accountReady ||
    !billId;

  useEffect(() => {
    if (statusEmail) persistCheckoutEmail(statusEmail);
  }, [statusEmail]);

  const handleSendSetPasswordEmail = useCallback(async () => {
    setResendError(null);
    if (!isSupabaseConfigured) {
      setResendError("Sign-in isn’t configured in this environment.");
      return;
    }
    if (resendCooldown > 0 || resendBusy) return;
    if (!billId) {
      setResendSuccess(null);
      setResendError(
        "We couldn’t verify your session. Please restart from checkout or contact support."
      );
      return;
    }

    setResendBusy(true);
    try {
      const res = await fetch("/api/billing/send-setup-email-for-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bill_id: billId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        delivery_email?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setResendSuccess(null);
        setResendError(
          data.error === "rate_limited"
            ? "Too many attempts. Wait a few minutes and try again."
            : data.error === "forbidden_origin"
              ? "Please refresh this page, then try again."
              : data.message ?? data.error ?? "Could not send email. Try again."
        );
        return;
      }
      const delivered = data.delivery_email?.trim() ?? "";
      if (!delivered) {
        setResendSuccess(null);
        setResendError(
          "We couldn’t verify your session. Please restart from checkout or contact support."
        );
        return;
      }
      persistCheckoutEmail(delivered);
      setResendSuccess(`Password setup email sent to ${delivered}`);
      setResendCooldown(ACCESS_EMAIL_COOLDOWN_SEC);
      try {
        const st = await fetch(`/api/billing/status?bill_id=${encodeURIComponent(billId)}`, {
          cache: "no-store",
        });
        const next = (await st.json().catch(() => ({}))) as BillingStatusResponse;
        if (st.ok && next?.bill_id) setStatus(next);
      } catch {
        /* ignore */
      }
    } finally {
      setResendBusy(false);
    }
  }, [billId, resendCooldown, resendBusy]);

  if (accountReady) {
    return (
      <main className="cb-auth-main">
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Your Account is Ready.</h1>
          {billId && <p className="mt-3 text-xs text-cb-green/60">Reference: {billId}</p>}
          {billId ? (
            <>
              {statusEmail ? (
                <PaymentTargetEmailLine email={statusEmail} variant="sent" className="mt-4 text-center text-sm" />
              ) : (
                <p className="mt-4 text-center text-sm text-cb-green/80">
                  Loading your registered email… You can still send the password setup email — it goes to the address we have
                  for this payment.
                </p>
              )}
              {resendSuccess && (
                <p className="mt-4 rounded-lg bg-cb-green/10 px-3 py-2 text-sm font-medium text-cb-green">{resendSuccess}</p>
              )}
              {resendError && <p className="cb-message-error mt-3 text-left text-sm">{resendError}</p>}
              <div className="mt-6 flex w-full flex-col gap-3">
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={sendDisabled}
                  onClick={() => void handleSendSetPasswordEmail()}
                >
                  {sendPasswordSetupPrimaryLabel(resendBusy, resendCooldown)}
                </button>
                <button type="button" className={btnSecondary} onClick={() => openWebInbox(statusEmail)}>
                  Open Email Inbox
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-cb-green/85">
              We couldn&apos;t verify this payment reference.{" "}
              <a href="/access" className="font-semibold underline">
                Open account access
              </a>{" "}
              or contact support.
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
              View Available Plans
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cb-auth-main">
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
          {!loading && billId && (
            <button
              type="button"
              className={btnSecondary}
              onClick={() => void fetchStatusOnce()}
            >
              Check payment status
            </button>
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
            View Available Plans
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
        <main className="cb-auth-main">
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
