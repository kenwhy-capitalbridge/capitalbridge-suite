"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { emailExists } from "@cb/advisory-graph/auth/emailCheck";
import { persistCheckoutEmail, buildAccessUrl } from "@/lib/checkoutEmailPersistence";
import { ButtonSpinner } from "@/components/ButtonSpinner";
import { NavAssignButton } from "@/components/NavAssignButton";
import { CalmAuthMessage } from "@/components/CalmAuthMessage";
import {
  CHECKOUT_ACCOUNT_EXISTS,
  CHECKOUT_ERROR_INVALID_RESPONSE,
  CHECKOUT_ERROR_NETWORK,
  CHECKOUT_ERROR_PROVIDER_MAINTENANCE,
  CHECKOUT_ERROR_REGION_MISMATCH,
  CHECKOUT_ERROR_START_PAYMENT,
} from "@/lib/checkoutMessages";
import {
  ACCESS_EMAIL_FIELD_LABEL,
  ACCESS_SUPPORT_HINT,
  FORM_EMAIL_INVALID,
} from "@/lib/sanitizeAuthErrorMessage";
import { getOrCreateTrialDeviceId } from "@/lib/trialDeviceId";
import {
  CHECKOUT_COUNTRIES,
  getCheckoutCountry,
  persistAdvisoryMarketPreference,
  STORAGE_CHECKOUT_COUNTRY_KEY,
  STORAGE_CHECKOUT_PHONE_KEY,
  type CheckoutCountryCode,
} from "@cb/shared/markets";

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
  trial: "Trial (10 Days)",
  monthly: "Monthly (30 Days)",
  quarterly: "Quarterly (90 Days)",
  yearly_full: "Strategic (365 Days)",
  strategic: "Strategic Execution (365 Days)",
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = useMemo(() => searchParams.get("plan") ?? "trial", [searchParams]);
  const planLabel = PLAN_LABELS[plan] ?? plan;

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const [firstNameFieldError, setFirstNameFieldError] = useState<string | null>(null);
  const [lastNameFieldError, setLastNameFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [securing, setSecuring] = useState(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [loginExistingPending, setLoginExistingPending] = useState(false);

  const [country, setCountry] = useState<CheckoutCountryCode>("MY");
  const [mobileNational, setMobileNational] = useState("");
  const [countryFieldError, setCountryFieldError] = useState<string | null>(null);
  const [mobileFieldError, setMobileFieldError] = useState<string | null>(null);
  const [geoLocked, setGeoLocked] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  /** Avoid `finally` re-enabling submit while redirecting (stale `securing` closure). */
  const redirectingRef = useRef(false);

  /** Country / price tier follows IP geo (server enforces the same). Not driven by ?market= or cookies. */
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/geo")
      .then((r) => r.json())
      .then((d: { country?: string; market?: string }) => {
        if (cancelled) return;
        const iso = typeof d?.country === "string" ? d.country.trim().toUpperCase() : "";
        const row = iso && CHECKOUT_COUNTRIES.find((c) => c.code === iso);
        if (row) {
          setCountry(row.code);
        } else {
          setCountry("MY");
        }
        setGeoLocked(true);
      })
      .catch(() => {
        if (!cancelled) setGeoLocked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const row = getCheckoutCountry(country);
    if (row) persistAdvisoryMarketPreference(row.market);
  }, [country]);

  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_CHECKOUT_PHONE_KEY);
      if (p) setMobileNational(p.replace(/\D/g, ""));
    } catch {
      /* ignore */
    }
  }, []);

  /** Auto-focus email for faster completion (invisible conversion). */
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      emailInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const typoSuggestion = useMemo(() => getEmailTypoSuggestion(email), [email]);
  const countryRow = getCheckoutCountry(country);
  const dialDisplay = countryRow?.dial ?? "+60";

  function validateEmail(value: string): boolean {
    const t = value.trim().toLowerCase();
    if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
      setEmailFieldError(FORM_EMAIL_INVALID);
      return false;
    }
    setEmailFieldError(null);
    return true;
  }

  function validateNames(f: string, l: string): boolean {
    let ok = true;
    if (!f.trim()) {
      setFirstNameFieldError("First name is required.");
      ok = false;
    } else {
      setFirstNameFieldError(null);
    }
    if (!l.trim()) {
      setLastNameFieldError("Last name is required.");
      ok = false;
    } else {
      setLastNameFieldError(null);
    }
    return ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    setEmailAlreadyExists(false);
    setLoading(true);
    submittingRef.current = true;

    const normalizedEmail = email.trim().toLowerCase();
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!validateEmail(normalizedEmail)) {
      setLoading(false);
      submittingRef.current = false;
      emailInputRef.current?.focus();
      return;
    }
    if (!validateNames(fn, ln)) {
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    const row = getCheckoutCountry(country);
    if (!row) {
      setCountryFieldError("Select a country.");
      setLoading(false);
      submittingRef.current = false;
      return;
    }
    setCountryFieldError(null);
    const digits = mobileNational.replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 14) {
      setMobileFieldError("Enter a valid mobile number (digits only).");
      setLoading(false);
      submittingRef.current = false;
      return;
    }
    setMobileFieldError(null);
    const fullPhone = `${row.dial.replace(/\s/g, "")}${digits}`;

    try {
      const exists = await emailExists(supabase, normalizedEmail);
      if (exists) {
        setError(CHECKOUT_ACCOUNT_EXISTS);
        setEmailAlreadyExists(true);
        emailInputRef.current?.focus();
        return;
      }

      const deviceId = plan === "trial" ? getOrCreateTrialDeviceId() : "";
      persistAdvisoryMarketPreference(row.market);
      try {
        localStorage.setItem(STORAGE_CHECKOUT_COUNTRY_KEY, country);
        localStorage.setItem(STORAGE_CHECKOUT_PHONE_KEY, digits);
      } catch {
        /* ignore */
      }
      const res = await fetch("/api/bill/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: normalizedEmail,
          firstName: fn,
          lastName: ln,
          plan,
          checkoutCountry: country,
          checkoutPhone: fullPhone,
          market: row.market,
          ...(deviceId ? { deviceId } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (
          res.status === 409 ||
          data?.error === "account_exists" ||
          String(data?.detail ?? "").toLowerCase().includes("already exists")
        ) {
          setError(CHECKOUT_ACCOUNT_EXISTS);
          setEmailAlreadyExists(true);
          emailInputRef.current?.focus();
          return;
        }
        if (res.status === 400 && data?.error === "name_required") {
          setError(
            typeof data?.message === "string"
              ? data.message
              : "First name and last name are required.",
          );
          validateNames(fn, ln);
          return;
        }
        if (res.status === 403 && data?.error === "trial_unavailable") {
          setError(
            typeof data?.message === "string"
              ? data.message
              : "Trial is not available for this device or network.",
          );
          return;
        }
        if (data?.error === "region_mismatch") {
          setError(CHECKOUT_ERROR_REGION_MISMATCH);
          return;
        }
        if (data?.error === "checkout_country_required" || data?.error === "invalid_checkout_country") {
          setError(CHECKOUT_ERROR_REGION_MISMATCH);
          return;
        }
        const message = typeof data?.message === "string" ? data.message : null;
        const detail = typeof data?.detail === "string" ? data.detail : null;
        const errorCode = typeof data?.error === "string" ? data.error : null;
        setError(
          message ||
            detail ||
            (errorCode === "bill_creation_failed"
              ? CHECKOUT_ERROR_PROVIDER_MAINTENANCE
              : errorCode) ||
            CHECKOUT_ERROR_START_PAYMENT,
        );
        return;
      }

      const checkoutUrl = data?.checkoutUrl ?? data?.payment_url;
      const billId = typeof data?.billId === "string" ? data.billId : null;
      if (typeof checkoutUrl === "string" && checkoutUrl) {
        redirectingRef.current = true;
        persistCheckoutEmail(normalizedEmail);
        setSecuring(true);
        setLoading(false);
        window.setTimeout(() => {
          const handoff = new URL("/payment-handoff", window.location.origin);
          handoff.searchParams.set("payment_url", checkoutUrl);
          handoff.searchParams.set("plan", plan);
          if (billId) handoff.searchParams.set("bill_id", billId);
          router.replace(`${handoff.pathname}${handoff.search}`);
        }, 400);
        return;
      }
      setError(CHECKOUT_ERROR_INVALID_RESPONSE);
    } catch {
      setError(CHECKOUT_ERROR_NETWORK);
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
          <h1 className="font-serif text-lg font-semibold text-cb-green sm:text-xl">
            Securing your access…
          </h1>
          <p className="mt-2 text-sm text-cb-green/80 sm:text-base">
            You&apos;re being moved to our secure payment page.
          </p>
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
        <h1 className="text-center font-serif text-lg font-semibold text-cb-green sm:text-xl">
          Start Building Your Capital Strategy
        </h1>
        <p className="cb-card-subtitle text-center">Set up your access in seconds.</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-cb-green/85">
          <p className="min-w-0 flex-1 text-left">Plan: {planLabel}</p>
          <NavAssignButton
            href="/pricing"
            className="cb-btn-auth-view-plans w-auto shrink-0"
            loadingLabel="Loading…"
          >
            View Other Plans
          </NavAssignButton>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:mt-6 sm:gap-4" noValidate>
          {error && <p className="cb-message-error text-sm sm:text-base">{error}</p>}

          <label className="grid gap-1.5 text-left">
            <span className="text-sm font-medium text-cb-green">{ACCESS_EMAIL_FIELD_LABEL}</span>
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
              We&apos;ll send your access link to this email. Please ensure your email is correct before
              continuing.
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

          <label className="grid gap-1.5 text-left">
            <span className="text-sm font-medium text-cb-green">First name</span>
            <input
              className="cb-input"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (firstNameFieldError) setFirstNameFieldError(null);
              }}
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              required
              aria-invalid={!!firstNameFieldError}
              aria-describedby={firstNameFieldError ? "checkout-first-name-error" : undefined}
            />
            {firstNameFieldError && (
              <p id="checkout-first-name-error" className="cb-message-error mt-1 text-sm">
                {firstNameFieldError}
              </p>
            )}
          </label>

          <label className="grid gap-1.5 text-left">
            <span className="text-sm font-medium text-cb-green">Last name</span>
            <input
              className="cb-input"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (lastNameFieldError) setLastNameFieldError(null);
              }}
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              required
              aria-invalid={!!lastNameFieldError}
              aria-describedby={lastNameFieldError ? "checkout-last-name-error" : undefined}
            />
            {lastNameFieldError && (
              <p id="checkout-last-name-error" className="cb-message-error mt-1 text-sm">
                {lastNameFieldError}
              </p>
            )}
          </label>

          <label className="grid gap-1.5 text-left">
            <span className="text-sm font-medium text-cb-green">Country</span>
            <select
              className="cb-input disabled:cursor-not-allowed disabled:opacity-70"
              value={country}
              disabled={geoLocked}
              onChange={(e) => {
                setCountry(e.target.value as CheckoutCountryCode);
                setCountryFieldError(null);
              }}
              autoComplete="country"
              aria-invalid={!!countryFieldError}
              aria-describedby={
                countryFieldError ? "checkout-country-error" : "checkout-country-hint"
              }
            >
              {CHECKOUT_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.label}
                </option>
              ))}
            </select>
            <p id="checkout-country-hint" className="text-xs leading-relaxed text-cb-green/65">
              {geoLocked
                ? "Your plan price is set for your region (from your connection). The country shown must match where you are paying from."
                : "Detecting your region…"}
            </p>
            {countryFieldError && (
              <p id="checkout-country-error" className="cb-message-error mt-1 text-sm">
                {countryFieldError}
              </p>
            )}
          </label>

          <div className="grid gap-1.5 text-left">
            <span className="text-sm font-medium text-cb-green">Mobile number</span>
            <div className="flex min-w-0 gap-2">
              <span
                className="cb-input flex shrink-0 items-center justify-center gap-1.5 px-3 font-mono text-sm text-cb-green/90"
                aria-hidden
              >
                <span>{countryRow?.flag}</span>
                <span>{dialDisplay}</span>
              </span>
              <input
                className="cb-input min-w-0 flex-1 font-mono"
                value={mobileNational}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "");
                  setMobileNational(d);
                  if (mobileFieldError) setMobileFieldError(null);
                }}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="tel-national"
                placeholder="Mobile number (digits only)"
                aria-invalid={!!mobileFieldError}
                aria-describedby={mobileFieldError ? "checkout-mobile-error" : undefined}
              />
            </div>
            {mobileFieldError && (
              <p id="checkout-mobile-error" className="cb-message-error mt-1 text-sm">
                {mobileFieldError}
              </p>
            )}
          </div>

          <p className="text-center text-sm leading-relaxed text-cb-green/75">
            You&apos;ll receive a secure email to set your password after payment.
          </p>

          <button
            className="cb-btn-primary w-full rounded-xl font-semibold transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            type="submit"
            disabled={loading || emailAlreadyExists}
            aria-busy={loading}
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-0">
                <ButtonSpinner className="border-cb-green/35 border-t-cb-green" />
                <span className="cb-visually-hidden">Securing your access…</span>
              </span>
            ) : (
              "Continue to Payment"
            )}
          </button>
        </form>

        <button
          type="button"
          className="cb-btn-secondary mt-4 w-full rounded-xl font-medium transition hover:scale-[1.02] sm:mt-5"
          disabled={loginExistingPending || loading}
          aria-busy={loginExistingPending}
          onClick={() => {
            if (loginExistingPending) return;
            setLoginExistingPending(true);
            const t = email.trim().toLowerCase();
            window.location.href = t.includes("@") ? buildAccessUrl({ email: t }) : "/access";
          }}
        >
          {loginExistingPending ? (
            <span className="inline-flex items-center justify-center gap-0">
              <ButtonSpinner className="border-cb-green/25 border-t-cb-green" />
              <span className="cb-visually-hidden">Loading…</span>
            </span>
          ) : (
            "Log into An Existing Account"
          )}
        </button>

        <div className="mt-4 border-t border-cb-gold/30 pt-3 sm:mt-5 sm:pt-4">
          <CalmAuthMessage
            text={ACCESS_SUPPORT_HINT}
            className="text-center text-sm font-normal leading-relaxed text-cb-green/55"
          />
        </div>
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
            <h1 className="font-serif text-lg font-semibold text-cb-green sm:text-xl">Checkout</h1>
            <p className="mt-3 text-sm text-cb-green/80 sm:text-base">Loading…</p>
            <div className="mt-4 flex justify-center" role="status" aria-busy="true">
              <ButtonSpinner className="h-6 w-6 border-cb-green/25 border-t-cb-green sm:h-7 sm:w-7" />
            </div>
          </div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
