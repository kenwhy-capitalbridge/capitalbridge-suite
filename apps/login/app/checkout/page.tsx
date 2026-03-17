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

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = useMemo(() => searchParams.get("plan") ?? "trial", [searchParams]);
  const planLabel = PLAN_LABELS[plan] ?? plan;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isDevOrPreview || typeof window === "undefined") return;
    const projectRef = liveTestRef();
    console.info(
      `Checkout debug: projectRef=${projectRef || "(none)"}, schema=public(billing), emailPrecheck=ON, signUpSequence=SAFE`
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const exists = await emailExists(supabase, email.trim());
      if (exists) {
        setError(
          "An account already exists for this email. Please log in instead or use \"Forgot password\"."
        );
        setLoading(false);
        emailInputRef.current?.focus();
        return;
      }

      const createAccountRes = await fetch("/api/auth/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        }),
      });

      const accountData = await createAccountRes.json().catch(() => ({}));

      if (!createAccountRes.ok) {
        if (isDevOrPreview) {
          console.warn("Billing debug:", {
            area: "billing",
            op: "create-account",
            status: createAccountRes.status,
            code: typeof accountData?.error === "string" ? accountData.error : null,
            message: typeof accountData?.detail === "string" ? accountData.detail : accountData?.message ?? null,
          });
        }
        const message = typeof accountData?.message === "string" ? accountData.message : null;
        const detail = typeof accountData?.detail === "string" ? accountData.detail : null;
        const errorCode = typeof accountData?.error === "string" ? accountData.error : null;

        if (errorCode === "account_exists") {
          setError(
            message ||
              detail ||
              "An account already exists for this email. Please log in instead or use \"Forgot password\"."
          );
          setLoading(false);
          emailInputRef.current?.focus();
          return;
        }

        setError(message || detail || errorCode || "Could not create account.");
        setLoading(false);
        return;
      }

      const cleanSuccess = accountData?.ok === true && !!accountData?.user_id;
      if (!cleanSuccess) {
        if (isDevOrPreview) {
          console.warn({ area: "checkout", branch: "anti-enum-detected" });
        }
        setError(
          "An account already exists for this email. Please log in instead or use \"Forgot password\"."
        );
        setLoading(false);
        emailInputRef.current?.focus();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Could not sign in after creating account.");
        setLoading(false);
        return;
      }

      await fetch("/api/register-session", { method: "POST", credentials: "include" }).catch(() => {});

      const res = await fetch("/api/bill/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (isDevOrPreview) {
          console.warn("Billing debug:", {
            area: "billing",
            op: "create select",
            status: res.status,
            code: typeof data?.error === "string" ? data.error : null,
            message: typeof data?.detail === "string" ? data.detail : data?.message ?? null,
          });
        }
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
          Create your account first, then continue to secure payment. Your access activates after payment is confirmed.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: "1.75rem", display: "grid", gap: "1rem" }}>
          {error && <p className="cb-message-error">{error}</p>}

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Email</span>
            <input
              ref={emailInputRef}
              className="cb-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Password</span>
            <input
              className="cb-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
            <span
              style={{
                fontSize: "0.8rem",
                color: "rgba(14,31,16,0.8)",
                marginTop: "0.1rem",
              }}
            >
              Passwords must be at least 6 characters (8+ recommended) and include lowercase, uppercase, digits and
              symbols.
            </span>
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Confirm password</span>
            <input
              className="cb-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              placeholder="Re-enter your password"
            />
          </label>

          <button className="cb-btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account and continue"}
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
