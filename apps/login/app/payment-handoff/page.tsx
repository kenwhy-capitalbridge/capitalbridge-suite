"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  ACCESS_EMAIL_COOLDOWN_SEC,
  ACCESS_EMAIL_SENDING_LABEL,
  accessEmailResendCooldownLabel,
} from "@/lib/resendAccessEmail";
import { buildAccessUrl, persistCheckoutEmail } from "@/lib/checkoutEmailPersistence";
import { PaymentTargetEmailLine } from "@/components/PaymentTargetEmailCopy";
import { CalmAuthMessage } from "@/components/CalmAuthMessage";
import {
  HANDOFF_FORBIDDEN_ORIGIN,
  HANDOFF_SUCCESS_EMAIL_SENT,
  PAYMENT_ERROR_EMAIL,
  PAYMENT_ERROR_NOT_CONFIGURED,
  PAYMENT_ERROR_RATE_LIMIT,
  PAYMENT_ERROR_SESSION,
  PAYMENT_HELP_LINE,
} from "@/lib/paymentFlowMessages";

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
  "cb-btn-primary block w-full text-center font-semibold shadow-lg transition hover:scale-[1.02] disabled:opacity-50";
const btnSecondary =
  "cb-btn-secondary block w-full text-center font-medium transition hover:scale-[1.02]";

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
  if (cooldownSec > 0) return accessEmailResendCooldownLabel(cooldownSec);
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
      setResendError(PAYMENT_ERROR_NOT_CONFIGURED);
      return;
    }
    if (resendCooldown > 0 || resendBusy) return;
    if (!billId) {
      setResendSuccess(null);
      setResendError(PAYMENT_ERROR_SESSION);
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
            ? PAYMENT_ERROR_RATE_LIMIT
            : data.error === "forbidden_origin"
              ? HANDOFF_FORBIDDEN_ORIGIN
              : data.message ?? data.error ?? PAYMENT_ERROR_EMAIL
        );
        return;
      }
      const delivered = data.delivery_email?.trim() ?? "";
      if (!delivered) {
        setResendSuccess(null);
        setResendError(PAYMENT_ERROR_SESSION);
        return;
      }
      persistCheckoutEmail(delivered);
      setResendSuccess(HANDOFF_SUCCESS_EMAIL_SENT);
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
              <div className="mt-4 flex w-full flex-col gap-2 sm:mt-6 sm:gap-3">
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
          <div className="mt-4 flex w-full flex-col items-center gap-2 sm:mt-6 sm:gap-3">
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
              View Other Plans
            </button>
          </div>
          <div className="mt-4 border-t border-cb-gold/30 pt-3 sm:mt-5 sm:pt-4">
            <CalmAuthMessage
              text={PAYMENT_HELP_LINE}
              className="text-center text-sm leading-relaxed text-cb-green/55"
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cb-auth-main">
      <div className="cb-card max-w-md">
        <h1 className="cb-card-title">Continue to Payment</h1>
        <p className="cb-card-subtitle">Plan: {planLabel}</p>

        <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem", fontSize: "0.92rem", opacity: 0.9 }}>
          {billId && <p>Reference: {billId}</p>}
        </div>

        <div style={{ marginTop: "1.25rem", display: "grid", gap: "0.9rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
          {loading && <p className="font-medium text-cb-green">Securing your access…</p>}
          {!loading && (
            <p className="text-sm leading-relaxed text-cb-green/90 sm:text-base">
              Complete the payment in a new tab. We&apos;ll email you a secure link to set your password upon
              confirmation.
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

        <div className="mt-4 grid gap-2 sm:mt-6 sm:gap-3">
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
            View Other Plans
          </button>
        </div>
        <div className="mt-4 border-t border-cb-gold/30 pt-3 sm:mt-5 sm:pt-4">
          <CalmAuthMessage
            text={PAYMENT_HELP_LINE}
            className="text-center text-sm leading-relaxed text-cb-green/55"
          />
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
