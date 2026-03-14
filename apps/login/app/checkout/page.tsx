"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial (7 Days)",
  monthly: "Monthly (30 Days)",
  quarterly: "Quarterly (90 Days)",
  yearly_full: "Strategic (365 Days)",
  strategic: "Strategic Execution (365 Days)",
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = useMemo(() => searchParams.get("plan") ?? "trial", [searchParams]);
  const planLabel = PLAN_LABELS[plan] ?? plan;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), plan, name: name.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data?.message === "string" ? data.message : null;
        const detail = typeof data?.detail === "string" ? data.detail : null;
        const errorCode = typeof data?.error === "string" ? data.error : null;
        setError(message || detail || errorCode || "Could not start payment.");
        setLoading(false);
        return;
      }
      const paymentUrl = data?.payment_url ?? data?.checkoutUrl;
      const billId = typeof data?.bill_id === "string" ? data.bill_id : null;
      if (typeof paymentUrl === "string" && paymentUrl) {
        const handoffUrl = new URL("/payment-handoff", window.location.origin);
        handoffUrl.searchParams.set("payment_url", paymentUrl);
        if (billId) handoffUrl.searchParams.set("bill_id", billId);
        handoffUrl.searchParams.set("plan", plan);
        window.location.href = handoffUrl.toString();
        return;
      }
      setError("Invalid response from server.");
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card">
        <h1 className="cb-card-title">Complete your purchase</h1>
        <p className="cb-card-subtitle">Plan: {planLabel}</p>
        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
          <Link className="cb-link" href="/pricing">
            &larr; View other plans
          </Link>
        </p>

        <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.9 }}>
          Enter your email. You will be redirected to payment. Your account is created only after successful payment.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: "1.75rem", display: "grid", gap: "1rem" }}>
          {error && <p className="cb-message-error">{error}</p>}

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Email</span>
            <input
              className="cb-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Name (optional)</span>
            <input
              className="cb-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Your name"
            />
          </label>

          <button className="cb-btn-primary" type="submit" disabled={loading}>
            {loading ? "Preparing payment…" : "Continue to payment"}
          </button>
        </form>

        <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.9 }}>
          Already have an account? <Link className="cb-link" href="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
          <div className="cb-card">
            <h1 className="cb-card-title">Checkout</h1>
            <p style={{ marginTop: "1rem", opacity: 0.9 }}>Loading…</p>
          </div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
