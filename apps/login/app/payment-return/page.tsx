"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getAccessRedirectUrlForAuthEmails } from "@/lib/authEmailRedirect";
import { isSupabaseConfigured, recoverySupabase } from "@/lib/supabaseClient";

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

const btnPrimary =
  "w-full rounded-xl bg-cb-gold px-4 py-3.5 text-center text-base font-semibold text-cb-green shadow-lg transition hover:scale-[1.02] hover:bg-cb-green hover:text-white disabled:opacity-50 disabled:hover:scale-100";
const btnSecondary =
  "w-full rounded-xl border-2 border-cb-gold/50 bg-white/90 px-4 py-3 text-center font-medium text-cb-green transition hover:scale-[1.02] hover:bg-white disabled:opacity-50 disabled:hover:scale-100";

/** Prefer provider web inbox from checkout email when we know it; else Gmail + user checks other apps. */
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

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const paid = searchParams.get("billplz[paid]") === "true";
  const paidAt = searchParams.get("billplz[paid_at]");
  const billId = searchParams.get("billplz[id]");

  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(!!billId);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const redirectTo = useMemo(() => getAccessRedirectUrlForAuthEmails(), []);

  useEffect(() => {
    if (!billId) return;

    let cancelled = false;

    if (paid) {
      fetch(`/api/billing/confirm-payment?bill_id=${encodeURIComponent(billId)}`, {
        method: "GET",
        cache: "no-store",
      }).catch(() => {});
    }

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
        if (!cancelled) {
          setLoading(false);
        }
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
  }, [billId, paid]);

  const accountReady = !!status?.account_ready;
  const waitingForWebhook = !accountReady && paid && !!billId;
  const statusEmail = status?.email?.trim() ?? null;

  const handleResendAccessEmail = useCallback(async () => {
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
    setResendBusy(true);
    const { error } = await recoverySupabase.auth.resetPasswordForEmail(em, {
      redirectTo,
    });
    setResendBusy(false);
    if (error) {
      setResendError(error.message);
      return;
    }
  }, [redirectTo, statusEmail]);

  if (!billId) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Payment</h1>
          <p className="cb-card-subtitle mt-2">
            If you just paid, go back to the tab from checkout or check the email you used there.
          </p>
          <p className="mt-3 text-sm text-cb-green/80">
            If you don&apos;t see the email, check your spam folder or resend it from your account page when you have your bill
            reference.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" className={btnPrimary} onClick={() => openWebInbox(null)}>
              Open Gmail
            </button>
            <p className="text-sm text-cb-green/75">Or check your email app</p>
          </div>
        </div>
      </main>
    );
  }

  if (loading || waitingForWebhook) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Securing your access…</h1>
          <p className="cb-card-subtitle mt-2">
            {paid
              ? "We're confirming your payment. This usually takes just a moment."
              : "Checking your payment status…"}
          </p>
          {paidAt && <p className="mt-4 text-sm text-cb-green/75">Paid at: {paidAt}</p>}
          {waitingForWebhook && (
            <p className="mt-4 text-sm text-cb-green/80">This page updates automatically every few seconds.</p>
          )}
        </div>
      </main>
    );
  }

  if (accountReady) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Check your email to activate your account</h1>
          <p className="cb-card-subtitle mt-3 text-base leading-relaxed">
            We&apos;ve sent you a secure link to set your password and access your dashboard.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-cb-green/85">
            If you don&apos;t see the email, check your spam folder or resend it.
          </p>
          {resendBusy && (
            <p className="mt-4 text-sm font-medium text-cb-green">Sending access email…</p>
          )}
          {resendError && <p className="cb-message-error mt-3 text-left text-sm">{resendError}</p>}
          <div className="mt-8 flex flex-col gap-3">
            <button type="button" className={btnPrimary} onClick={() => openWebInbox(statusEmail)}>
              Open Gmail
            </button>
            <p className="text-sm text-cb-green/75">Or check your email app</p>
            <button
              type="button"
              className={btnSecondary}
              disabled={resendBusy || !isSupabaseConfigured}
              onClick={() => void handleResendAccessEmail()}
            >
              {resendBusy ? "Sending access email…" : "Resend access email"}
            </button>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-cb-green/65">
            Check your spam folder if you don&apos;t see it
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card max-w-md text-center">
        <h1 className="cb-card-title">Payment pending</h1>
        <p className="cb-card-subtitle mt-2">
          We couldn&apos;t confirm payment from this page yet. Check the email you used at checkout for a link to finish setup.
        </p>
        <p className="mt-3 text-sm text-cb-green/85">
          If you don&apos;t see the email, check your spam folder or resend it.
        </p>
        {billId && <p className="mt-4 text-xs text-cb-green/55">Reference: {billId}</p>}
        {status?.next_step === "contact_support" && (
          <p className="cb-message-error mt-4 text-sm">
            We couldn&apos;t match this payment yet. Contact support with the reference above.
          </p>
        )}
        {resendBusy && (
          <p className="mt-4 text-sm font-medium text-cb-green">Sending access email…</p>
        )}
        {resendError && <p className="cb-message-error mt-3 text-sm">{resendError}</p>}
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" className={btnPrimary} onClick={() => openWebInbox(statusEmail)}>
            Open Gmail
          </button>
          <p className="text-sm text-cb-green/75">Or check your email app</p>
          <button
            type="button"
            className={btnSecondary}
            disabled={resendBusy || !isSupabaseConfigured}
            onClick={() => void handleResendAccessEmail()}
          >
            {resendBusy ? "Sending access email…" : "Resend access email"}
          </button>
        </div>
        <p className="mt-6 text-xs text-cb-green/65">Check your spam folder if you don&apos;t see it</p>
      </div>
    </main>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
          <div className="cb-card max-w-md text-center">
            <h1 className="cb-card-title">Securing your access…</h1>
            <p className="cb-card-subtitle mt-2">One moment.</p>
          </div>
        </main>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
