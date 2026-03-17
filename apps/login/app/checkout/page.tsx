"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { emailExists } from "@cb/advisory-graph/auth/emailCheck";

const isDevOrPreview =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENV === "staging");

function liveTestRef(): string {
  const url = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "" : "";
  if (!url) return "";
  return url.replace(/^https?:\/\//, "").split(".")[0] ?? "";
}

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial (7 Days)",
  monthly: "Monthly (30 Days)",
  quarterly: "Quarterly (90 Days)",
  yearly_full: "Strategic (365 Days)",
  strategic: "Strategic Execution (365 Days)",
};

const ACCOUNT_EXISTS_MSG =
  'An account already exists for this email. Please log in instead or use "Forgot password".';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = useMemo(() => searchParams.get("plan") ?? "trial", [searchParams]);
  const planLabel = PLAN_LABELS[plan] ?? plan;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!isDevOrPreview || typeof window === "undefined") return;
    const projectRef = liveTestRef();
    console.info(
      `Checkout debug: projectRef=${projectRef || "(none)"}, schema=public(billing), payment-first=ON`
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    setEmailAlreadyExists(false);
    setLoading(true);
    submittingRef.current = true;

    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }

      const exists = await emailExists(supabase, trimmedEmail);
      if (exists) {
        setError(ACCOUNT_EXISTS_MSG);
        setEmailAlreadyExists(true);
        emailInputRef.current?.focus();
        return;
      }

      const res = await fetch("/api/bill/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: trimmedEmail,
          name: name.trim() || undefined,
          plan,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.error === "account_exists" || String(data?.detail ?? "").toLowerCase().includes("already exists")) {
          setError(ACCOUNT_EXISTS_MSG);
          setEmailAlreadyExists(true);
          emailInputRef.current?.focus();
          return;
        }
        const message = typeof data?.message === "string" ? data.message : null;
        const detail = typeof data?.detail === "string" ? data.detail : null;
        const errorCode = typeof data?.error === "string" ? data.error : null;
        setError(message || detail || errorCode || "Could not start payment.");
        return;
      }

      const checkoutUrl = data?.checkoutUrl ?? data?.payment_url;
      if (typeof checkoutUrl === "string" && checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      setError("Invalid response from server.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      {isDevOrPreview && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            bottom: 8,
            left: 8,
            fontSize: "0.7rem",
            opacity: 0.5,
            pointerEvents: "none",
            fontFamily: "monospace",
          }}
        >
          LIVE TEST • schema:public
        </div>
      )}
      <div className="cb-card">
        <h1 className="cb-card-title">Complete your purchase</h1>
        <p className="cb-card-subtitle">Plan: {planLabel}</p>
        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
          <Link className="cb-link" href="/pricing">
            &larr; View other plans
          </Link>
        </p>

        <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.9 }}>
          Enter your details and continue to secure payment. Your account is created only after payment is confirmed.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: "1.75rem", display: "grid", gap: "1rem" }}>
          {error && <p className="cb-message-error">{error}</p>}

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Email</span>
            <input
              ref={emailInputRef}
              className="cb-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailAlreadyExists) setEmailAlreadyExists(false);
              }}
              type="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Name</span>
            <input
              className="cb-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Your name"
            />
          </label>

          <button
            className="cb-btn-primary"
            type="submit"
            disabled={loading || emailAlreadyExists}
          >
            {loading ? "Redirecting to payment…" : "Continue to payment"}
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
