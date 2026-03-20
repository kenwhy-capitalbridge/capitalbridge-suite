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

function PaymentHandoffContent() {
  const searchParams = useSearchParams();
  const paymentUrl = searchParams.get("payment_url");
  const billId = searchParams.get("bill_id");
  const plan = searchParams.get("plan") ?? "trial";
  const planLabel = PLAN_LABELS[plan] ?? plan;

  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(!!billId);

  const accessHref = useMemo(
    () => `/access?redirectTo=${encodeURIComponent(LOGIN_REDIRECT)}`,
    []
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

  const accountReady = !!status?.account_ready;

  function openMailto() {
    window.location.href = "mailto:";
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
            <button type="button" className={btnSecondary} onClick={() => { window.location.href = accessHref; }}>
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
        <h1 className="cb-card-title">Continue to payment</h1>
        <p className="cb-card-subtitle">Plan: {planLabel}</p>

        <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem", fontSize: "0.92rem", opacity: 0.9 }}>
          {billId && <p>Reference: {billId}</p>}
        </div>

        <div style={{ marginTop: "1.25rem", display: "grid", gap: "0.9rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
          {loading && <p className="font-medium text-cb-green">Securing your access…</p>}
          {!loading && (
            <p>
              Open secure payment in a new tab. After you pay, check your email for a link to create your password — you won&apos;t
              need to sign in until then.
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
          <button type="button" className="cb-btn-view-plans mx-auto" onClick={() => { window.location.href = "/pricing"; }}>
            View All Plans
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
