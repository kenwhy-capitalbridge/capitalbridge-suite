"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { emailExists } from "@cb/advisory-graph/auth/emailCheck";
import { persistCheckoutEmail, buildAccessUrl } from "@/lib/checkoutEmailPersistence";

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
  "An account already exists for this email. Log in below, or open account access and use Send password link again if you need a new link.";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = useMemo(() => searchParams.get("plan") ?? "trial", [searchParams]);
  const planLabel = PLAN_LABELS[plan] ?? plan;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [securing, setSecuring] = useState(false);
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

  function validateEmail(value: string): boolean {
    const t = value.trim();
    if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
      setEmailFieldError("Please enter a valid email address.");
      return false;
    }
    setEmailFieldError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    setEmailAlreadyExists(false);
    if (!validateEmail(email)) {
      emailInputRef.current?.focus();
      return;
    }
    setLoading(true);
    submittingRef.current = true;

    try {
      const trimmedEmail = email.trim();

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
        if (
          res.status === 409 ||
          data?.error === "account_exists" ||
          String(data?.detail ?? "").toLowerCase().includes("already exists")
        ) {
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
        persistCheckoutEmail(trimmedEmail);
        setSecuring(true);
        setLoading(false);
        window.setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 400);
        return;
      }
      setError("Invalid response from server.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      if (!securing) setLoading(false);
      submittingRef.current = false;
    }
  }

  if (securing) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Securing your access…</h1>
          <p className="cb-card-subtitle mt-2">You&apos;re being moved to our secure payment page.</p>
        </div>
      </main>
    );
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
        <h1 className="cb-card-title">Start Building Your Capital Strategy</h1>
        <p className="cb-card-subtitle">Set up your access in seconds.</p>
        <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", opacity: 0.9 }}>Plan: {planLabel}</p>
        <div className="mt-2 flex justify-start">
          <button
            type="button"
            className="cb-btn-auth-view-plans w-auto max-w-[12rem]"
            onClick={() => {
              window.location.href = "/pricing";
            }}
          >
            View Other Plans
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}>
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
                if (emailFieldError) setEmailFieldError(null);
              }}
              onBlur={() => {
                const t = email.trim();
                if (t) {
                  validateEmail(email);
                  if (t.includes("@")) persistCheckoutEmail(t);
                }
              }}
              type="email"
              required
              placeholder="you@example.com"
            />
            {emailFieldError && (
              <p className="cb-message-error" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
                {emailFieldError}
              </p>
            )}
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
            className="cb-btn-primary w-full rounded-xl py-3.5 text-base font-semibold transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            type="submit"
            disabled={loading || emailAlreadyExists}
          >
            {loading ? "Securing your access…" : "Continue to Payment"}
          </button>
          <p className="text-center text-sm leading-relaxed text-cb-green/80">
            After payment, we&apos;ll email you a link to set your password.
          </p>
        </form>

        <button
          type="button"
          className="cb-btn-secondary mt-5 w-full rounded-xl py-3 font-medium transition hover:scale-[1.02]"
          onClick={() => {
            const t = email.trim();
            window.location.href = t.includes("@") ? buildAccessUrl({ email: t }) : "/access";
          }}
        >
          Log in to existing account
        </button>
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
