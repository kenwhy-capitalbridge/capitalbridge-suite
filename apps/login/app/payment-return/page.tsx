"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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

const platformBase =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLATFORM_APP_URL : undefined) ??
  "https://platform.thecapitalbridge.com";
const LOGIN_REDIRECT = platformBase.replace(/\/$/, "");

const btnPrimary =
  "w-full rounded-xl bg-cb-gold px-4 py-3.5 text-center text-base font-semibold text-cb-green shadow-lg transition hover:scale-[1.02] hover:bg-cb-green hover:text-white disabled:opacity-50";
const btnSecondary =
  "w-full rounded-xl border-2 border-cb-gold/50 bg-white/90 px-4 py-3 text-center font-medium text-cb-green transition hover:scale-[1.02] hover:bg-white disabled:opacity-50";

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const paid = searchParams.get("billplz[paid]") === "true";
  const paidAt = searchParams.get("billplz[paid_at]");
  const billId = searchParams.get("billplz[id]");

  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(!!billId);

  const accessHref = useMemo(
    () => `/access?redirectTo=${encodeURIComponent(LOGIN_REDIRECT)}`,
    []
  );

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

  function openMailto() {
    window.location.href = "mailto:";
  }

  if (!billId) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Payment</h1>
          <p className="cb-card-subtitle mt-2">
            If you just paid, use the return link from checkout or open your email for next steps.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" className={btnSecondary} onClick={openMailto}>
              Open my email
            </button>
            <button type="button" className="cb-btn-view-plans mx-auto" onClick={() => { window.location.href = "/pricing"; }}>
              View All Plans
            </button>
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
          {billId && <p className="mt-2 text-xs text-cb-green/60">Reference: {billId}</p>}
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
          {billId && <p className="mt-4 text-xs text-cb-green/60">Reference: {billId}</p>}
          <div className="mt-8 flex flex-col items-center gap-4">
            <button type="button" className="cb-btn-view-plans px-4 py-2 text-sm normal-case tracking-normal" onClick={openMailto}>
              Open my email
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                window.location.href = accessHref;
              }}
            >
              I opened my email link — continue
            </button>
            <button type="button" className="cb-btn-view-plans" onClick={() => { window.location.href = "/pricing"; }}>
              View All Plans
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card max-w-md">
        <h1 className="cb-card-title">Payment pending</h1>
        <p className="cb-card-subtitle mt-2">
          We couldn&apos;t confirm payment from this page. If you already paid, check your email for a link to finish setup.
        </p>
        {billId && <p className="mt-4 text-sm text-cb-green/75">Reference: {billId}</p>}
        {status?.next_step === "contact_support" && (
          <p className="cb-message-error mt-4 text-sm">We couldn&apos;t match this payment yet. Contact support with the reference above.</p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" className={btnPrimary} onClick={openMailto}>
            Open my email
          </button>
          <button type="button" className={btnSecondary} onClick={() => { window.location.href = accessHref; }}>
            Continue to account page
          </button>
          <button type="button" className="cb-btn-view-plans mx-auto" onClick={() => { window.location.href = "/pricing"; }}>
            View All Plans
          </button>
        </div>
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
