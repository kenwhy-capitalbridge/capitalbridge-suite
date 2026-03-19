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

const btnBase =
  "w-full rounded-xl px-4 py-3 text-center font-medium transition hover:scale-[1.02] disabled:opacity-50";
const btnPrimary = `${btnBase} cb-btn-primary block`;
const btnSecondary = `${btnBase} cb-btn-secondary block`;

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
          if (data.account_ready) {
            window.setTimeout(() => {
              if (!cancelled) window.location.href = accessHref;
            }, 1500);
          }
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
  }, [billId, accessHref]);

  const accountReady = !!status?.account_ready;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card">
        <h1 className="cb-card-title">{accountReady ? "Account ready" : "Continue to secure payment"}</h1>
        <p className="cb-card-subtitle">Plan: {planLabel}</p>

        <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem", fontSize: "0.92rem", opacity: 0.9 }}>
          {billId && <p>Bill ID: {billId}</p>}
          {status?.mode && <p>Flow: {status.mode}</p>}
          {status?.billing_status && <p>Billing status: {status.billing_status}</p>}
        </div>

        <div style={{ marginTop: "1.25rem", display: "grid", gap: "0.9rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
          {!accountReady && (
            <p>
              Open Billplz in a new tab to complete payment. Keep this page open so we can detect when your account is ready.
            </p>
          )}
          {loading && <p>Checking account status…</p>}
          {!loading && accountReady && <p>Your account is ready. Taking you to sign in…</p>}
          {!loading && !accountReady && (
            <p>
              After you complete payment, return to this page or use the Billplz merchant return link. We will keep checking your
              setup automatically.
            </p>
          )}
        </div>

        <div style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
          {paymentUrl && (
            <a
              className={btnPrimary}
              href={paymentUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open secure payment
            </a>
          )}
          <button type="button" className={btnSecondary} onClick={() => { window.location.href = accessHref; }}>
            Open my account
          </button>
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
          <div className="cb-card">
            <h1 className="cb-card-title">Preparing payment</h1>
            <p className="cb-card-subtitle">Loading your secure payment handoff…</p>
          </div>
        </main>
      }
    >
      <PaymentHandoffContent />
    </Suspense>
  );
}
