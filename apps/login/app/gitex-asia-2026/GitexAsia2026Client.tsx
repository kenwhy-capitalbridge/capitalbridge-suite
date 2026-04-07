"use client";

import { useState } from "react";
import Link from "next/link";
import { CHECKOUT_COUNTRIES, MARKET_LABELS, type MarketId } from "@cb/shared/markets";

const ADVISORY_MARKET_OPTIONS = CHECKOUT_COUNTRIES.map((c) => ({
  value: c.market,
  label: `${c.flag} ${c.label} (${MARKET_LABELS[c.market]})`,
}));

const ERROR_COPY: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  invalid_market: "Select a valid country or region.",
  invalid_code: "Invalid code.",
  invalid_json: "Something went wrong. Try again.",
  already_used: "This code has already been used.",
  expired: "This code has expired.",
  already_subscribed: "This email already has a paid membership. Use the standard sign-in flow.",
  already_redeemed_gitex: "This account already redeemed GITEX access.",
  activation_failed: "Could not activate access. Try again or contact support.",
  account_create_failed:
    "Could not create an account. If you already have an account, sign in first, then redeem from profile (or use the same email here).",
  profile_create_failed: "Could not complete setup. Try again.",
  coupon_lock_failed: "Could not finalize this code. Try again.",
};

export function GitexAsia2026Client() {
  const [email, setEmail] = useState("");
  const [advisoryMarket, setAdvisoryMarket] = useState<MarketId>("MY");
  const [couponCode, setCouponCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorKey(null);
    setBusy(true);
    try {
      const res = await fetch("/api/gitex/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          couponCode: couponCode.trim(),
          advisoryMarket,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        magicLink?: string | null;
        message?: string;
      };
      if (!res.ok) {
        setErrorKey(data.error ?? "activation_failed");
        return;
      }
      if (data.magicLink && typeof window !== "undefined") {
        window.location.href = data.magicLink;
        return;
      }
      setDone(true);
    } catch {
      setErrorKey("activation_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-lg px-4 py-12 font-sans text-cb-cream">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-cb-gold/90">
        Capital Bridge
      </p>
      <h1 className="mb-4 text-center font-serif text-2xl font-bold leading-snug text-cb-gold md:text-3xl">
        GITEX ASIA 2026 — Preferred and Extended Access
      </h1>
      <p className="mb-6 text-center text-sm leading-relaxed text-cb-cream">Build your Forever Income.</p>
      <div className="mb-8 space-y-3 text-sm leading-relaxed text-cb-cream">
        <p>This experience introduces how your capital is:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Evaluated for sustainability</li>
          <li>Structured for growth</li>
          <li>Tested under stress</li>
        </ul>
        <ul className="list-disc space-y-1 pl-5">
          <li>15cm Lion → 7-Day Access (Preferred Access)</li>
          <li>25cm Lion → 14-Day Access (Extended Access)</li>
        </ul>
        <p>Redeem before 30 April 2026.</p>
        <p>Each coupon is only valid for one-time usage.</p>
      </div>

      {done ? (
        <div
          className="rounded-lg border border-cb-gold/30 bg-cb-cream/10 px-4 py-3 text-sm leading-relaxed text-cb-cream"
          role="status"
        >
          Access is being activated. Check your email for a sign-in link to the advisory platform, or open the Capital
          Bridge platform and sign in with the same email.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="gitex-email" className="mb-1 block text-sm font-medium text-cb-cream">
              Email <span className="text-red-300">*</span>
            </label>
            <input
              id="gitex-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="cb-input w-full"
            />
          </div>
          <div>
            <label htmlFor="gitex-advisory-market" className="mb-1 block text-sm font-medium text-cb-cream">
              Country / region <span className="text-red-300">*</span>
            </label>
            <select
              id="gitex-advisory-market"
              name="advisoryMarket"
              required
              value={advisoryMarket}
              onChange={(e) => setAdvisoryMarket(e.target.value as MarketId)}
              className="cb-input w-full cursor-pointer"
              aria-label="Advisory region and currency"
            >
              {ADVISORY_MARKET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs leading-relaxed text-cb-cream/75">
              Same list as profile: model apps use the currency for this region.
            </p>
          </div>
          <div>
            <label htmlFor="gitex-code" className="mb-1 block text-sm font-medium text-cb-cream">
              Coupon code <span className="text-red-300">*</span>
            </label>
            <input
              id="gitex-code"
              name="couponCode"
              type="text"
              required
              placeholder="CB-GITEX-15-XXXX"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="cb-input w-full font-mono"
            />
          </div>
          {errorKey ? (
            <p className="text-sm text-red-300" role="alert">
              {ERROR_COPY[errorKey] ?? ERROR_COPY.activation_failed}
            </p>
          ) : null}
          <button type="submit" disabled={busy} className="cb-btn-primary w-full font-semibold disabled:opacity-60">
            {busy ? "Unlocking…" : "Unlock Access"}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-cb-cream/75">
        <Link href="/pricing" className="text-cb-gold underline underline-offset-2 hover:text-cb-cream">
          Back to pricing
        </Link>
      </p>
    </main>
  );
}
