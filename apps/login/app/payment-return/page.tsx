"use client";

import Link from "next/link";
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

const LOGIN_REDIRECT = "https://platform.thecapitalbridge.com/dashboard";

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const paid = searchParams.get("billplz[paid]") === "true";
  const paidAt = searchParams.get("billplz[paid_at]");
  const billId = searchParams.get("billplz[id]");

  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(!!billId);

  const loginHref = useMemo(
    () => `/login?redirectTo=${encodeURIComponent(LOGIN_REDIRECT)}`,
    []
  );

  useEffect(() => {
    if (!billId) return;

    let cancelled = false;

    // When user returns with paid=true, trigger confirm-payment so we create account + send set-password email
    // even if the Billplz callback (webhook) never fired (e.g. BILLPLZ_CALLBACK_URL not set).
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
              if (!cancelled) window.location.href = loginHref;
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
  }, [billId, paid, loginHref]);

  const accountReady = !!status?.account_ready;
  const waitingForWebhook = !accountReady && paid;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card">
        <h1 className="cb-card-title">
          {accountReady ? "Account ready" : paid ? "Payment received" : "Payment pending"}
        </h1>
        <p className="cb-card-subtitle">
          {accountReady
            ? "Your account setup is complete. Redirecting you to login now."
            : paid
              ? "Your payment was submitted successfully. We are checking whether your account has been activated."
              : "We could not confirm the payment status from the redirect alone."}
        </p>

        <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem", fontSize: "0.92rem", opacity: 0.9 }}>
          {billId && <p>Bill ID: {billId}</p>}
          {paidAt && <p>Paid at: {paidAt}</p>}
          {status?.mode && <p>Flow: {status.mode}</p>}
          {status?.billing_status && <p>Billing status: {status.billing_status}</p>}
          {status?.email && <p>Email: {status.email}</p>}
        </div>

        <div style={{ marginTop: "1.25rem", display: "grid", gap: "0.9rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
          {loading && <p>Checking account status…</p>}
          {waitingForWebhook && (
            <p>
              Your payment has been recorded, but account activation is still in progress. This page refreshes automatically every
              few seconds.
            </p>
          )}
          {!loading && !accountReady && (
            <p>
              If setup takes more than a minute, use your payment email on{" "}
              <Link className="cb-link" href="/forgot-password">
                Forgot Password
              </Link>{" "}
              or contact support with your Bill ID.
            </p>
          )}
          {!loading && status?.next_step === "contact_support" && (
            <p>We could not find your bill in our activation records yet. Please contact support and include the Bill ID above.</p>
          )}
        </div>

        <div style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
          <Link className="cb-btn-primary" href={loginHref}>
            Go to login
          </Link>
          <Link className="cb-link" href="/forgot-password">
            Set password
          </Link>
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
          <div className="cb-card">
            <h1 className="cb-card-title">Payment received</h1>
            <p className="cb-card-subtitle">Loading your account status…</p>
          </div>
        </main>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
