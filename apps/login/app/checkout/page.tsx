"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { emailExists } from "@cb/advisory-graph/auth/emailCheck";
import { persistCheckoutEmail, buildAccessUrl } from "@/lib/checkoutEmailPersistence";

/** Assistive only — common domain typos (does not block submit). */
function getEmailTypoSuggestion(raw: string): string | null {
  const t = raw.trim();
  const at = t.lastIndexOf("@");
  if (at < 0) return null;
  const local = t.slice(0, at);
  const domain = t.slice(at + 1).toLowerCase();
  const fixes: Record<string, string> = {
    "gmai.com": "gmail.com",
    "gmial.com": "gmail.com",
  };
  const to = fixes[domain];
  if (!to) return null;
  return `${local}@${to}`;
}

const isDevOrPreview =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENV === "staging");

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial (7 Days)",
  monthly: "Monthly (30 Days)",
  quarterly: "Quarterly (90 Days)",
  yearly_full: "Strategic (365 Days)",
  strategic: "Strategic Execution (365 Days)",
};

const ACCOUNT_EXISTS_MSG =
  "An account already exists for this email. Log in below, or open account access and use Send Password Set Up Email Again if you need a new link.";

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
  /** Avoid `finally` re-enabling submit while redirecting (stale `securing` closure). */
  const redirectingRef = useRef(false);

  /** Auto-focus email for faster completion (invisible conversion). */
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      emailInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const typoSuggestion = useMemo(() => getEmailTypoSuggestion(email), [email]);

  function validateEmail(value: string): boolean {
    const t = value.trim().toLowerCase();
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
    setLoading(true);
    submittingRef.current = true;

    const normalizedEmail = email.trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
      setLoading(false);
      submittingRef.current = false;
      emailInputRef.current?.focus();
      return;
    }

    try {
      const exists = await emailExists(supabase, normalizedEmail);
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
          email: normalizedEmail,
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
        redirectingRef.current = true;
        persistCheckoutEmail(normalizedEmail);
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
      if (!redirectingRef.current) {
        setLoading(false);
        submittingRef.current = false;
      }
    }
  }

  if (securing) {
    return (
      <main className="cb-auth-main">
        <div className="cb-card mx-auto w-full max-w-md text-center">
          <h1 className="font-serif text-xl font-semibold text-cb-green">Securing your access…</h1>
          <p className="mt-2 text-base text-cb-green/80">You&apos;re being moved to our secure payment page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="cb-auth-main">
      {isDevOrPreview && (
        <div
          aria-hidden
          className="pointer-events-none fixed bottom-2 left-2 font-mono text-sm opacity-50"
        >
          LIVE TEST • schema:public
        </div>
      )}
      <div className="cb-card mx-auto w-full max-w-md">
        <h1 className="text-center font-serif text-xl font-semibold text-cb-green">
          Start Building Your Capital Strategy
        </h1>
        <p className="cb-card-subtitle text-center">Set up your access in seconds.</p>
        <p className="mt-3 text-center text-sm text-cb-green/85">Plan: {planLabel}</p>
        <div className="mt-2 flex justify-start">
          <button
            type="button"
            className="cb-btn-auth-view-plans w-auto max-w-[12rem]"
            onClick={() => {
              window.location.href = "/pricing";
            }}
          >
            View Available Plans
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
          {error && <p className="cb-message-error text-base">{error}</p>}

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-cb-green">Email</span>
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
                const t = email.trim().toLowerCase();
                if (t) {
                  validateEmail(t);
                  if (t.includes("@")) persistCheckoutEmail(t);
                }
              }}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
            <p className="text-sm leading-relaxed text-cb-green/75">
              We&apos;ll send your access link to this email.
            </p>
            {typoSuggestion && typoSuggestion !== email.trim().toLowerCase() && (
              <p className="text-sm text-cb-green/80">
                Did you mean{" "}
                <a href={`mailto:${typoSuggestion}`} className="cb-link font-medium underline">
                  {typoSuggestion}
                </a>
                ?
              </p>
            )}
            {emailFieldError && <p className="cb-message-error mt-1 text-sm">{emailFieldError}</p>}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-cb-green">Name</span>
            <input
              className="cb-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              autoComplete="name"
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
          <p className="text-center text-sm leading-relaxed text-cb-green/75">
            Please make sure your email is correct before continuing.
          </p>
          <p className="text-center text-sm leading-relaxed text-cb-green/75">
            You&apos;ll receive a secure email to set your password after payment.
          </p>
        </form>

        <button
          type="button"
          className="cb-btn-secondary mt-5 w-full rounded-xl py-3 text-base font-medium transition hover:scale-[1.02]"
          onClick={() => {
            const t = email.trim().toLowerCase();
            window.location.href = t.includes("@") ? buildAccessUrl({ email: t }) : "/access";
          }}
        >
          Log in to Existing Account
        </button>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="cb-auth-main">
          <div className="cb-card mx-auto w-full max-w-md text-center">
            <h1 className="font-serif text-xl font-semibold text-cb-green">Checkout</h1>
            <p className="mt-3 text-base text-cb-green/80">Loading…</p>
          </div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
