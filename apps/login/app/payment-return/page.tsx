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

const btnBase =
  "w-full rounded-xl px-4 py-3 font-medium transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100";
const btnPrimary = `${btnBase} cb-btn-primary`;
const btnSecondary = `${btnBase} cb-btn-secondary`;

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
          if (data.account_ready) {
            window.setTimeout(() => {
              if (!cancelled) window.location.href = accessHref;
            }, 1500);
          }
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
  }, [billId, paid, accessHref]);

  const accountReady = !!status?.account_ready;
  const waitingForWebhook = !accountReady && paid;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card max-w-md">
        <h1 className="cb-card-title">
          {accountReady ? "You&apos;re almost there" : paid ? "Securing your access…" : "Payment pending"}
        </h1>
        <p className="cb-card-subtitle">
          {accountReady
            ? "Opening your account page so you can finish sign-in."
            : paid
              ? "We&apos;re confirming your payment. This usually takes just a moment."
              : "We couldn&apos;t confirm payment from this page alone. If you already paid, you can still open your account below."}
        </p>

        <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem", fontSize: "0.92rem", opacity: 0.9 }}>
          {billId && <p>Reference: {billId}</p>}
          {paidAt && <p>Paid at: {paidAt}</p>}
        </div>

        <div style={{ marginTop: "1.25rem", display: "grid", gap: "0.9rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
          {loading && <p>Checking your status…</p>}
          {waitingForWebhook && <p>This page updates automatically every few seconds.</p>}
          {!loading && !accountReady && status?.next_step === "contact_support" && (
            <p>We couldn&apos;t match this payment yet. Please contact support with the reference above.</p>
          )}
        </div>

        <div style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
          <button type="button" className={btnPrimary} onClick={() => { window.location.href = accessHref; }}>
            Open my account
          </button>
          <button type="button" className={btnSecondary} onClick={() => { window.location.href = "/access"; }}>
            Send me a sign-in link
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
