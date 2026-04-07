"use client";

import { useState } from "react";
import Link from "next/link";

const ERROR_COPY: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  invalid_code: "Invalid code.",
  invalid_json: "Something went wrong. Try again.",
  already_used: "This code has already been used.",
  expired: "This code has expired.",
  already_subscribed: "This email already has a paid membership. Use the standard sign-in flow.",
  already_redeemed_gitex: "This account already redeemed GITEX access.",
  activation_failed: "Could not activate access. Try again or contact support.",
  account_create_failed: "Could not create an account. If you already have an account, sign in first, then redeem from profile (or use the same email here).",
  profile_create_failed: "Could not complete setup. Try again.",
  coupon_lock_failed: "Could not finalize this code. Try again.",
};

export function GitexAsia2026Client() {
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email: email.trim(), couponCode: couponCode.trim() }),
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
    <main className="mx-auto min-h-[70vh] max-w-lg px-4 py-12 text-[#0d3a1d]">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#0d3a1d]/80">
        Capital Bridge
      </p>
      <h1 className="mb-4 text-center font-serif text-2xl font-bold leading-snug md:text-3xl">
        GITEX ASIA 2026 — Preferred Access
      </h1>
      <p className="mb-6 text-center text-sm leading-relaxed text-[#0d3a1d]/90">
        Build your Forever Income.
      </p>
      <p className="mb-3 text-sm font-medium">This experience introduces how your capital is:</p>
      <ul className="mb-6 list-disc space-y-1 pl-5 text-sm leading-relaxed">
        <li>evaluated for sustainability</li>
        <li>structured for growth</li>
        <li>tested under stress</li>
      </ul>
      <p className="mb-2 text-sm font-medium">Choose your access:</p>
      <ul className="mb-8 list-none space-y-1 text-sm leading-relaxed">
        <li>• 15cm Lion → 7-Day Access</li>
        <li>• 25cm Lion → 14-Day Access</li>
      </ul>

      {done ? (
        <div
          className="rounded-lg border border-[rgba(13,58,29,0.2)] bg-[rgba(13,58,29,0.04)] px-4 py-3 text-sm leading-relaxed"
          role="status"
        >
          Access is being activated. Check your email for a sign-in link to the advisory platform, or open the Capital
          Bridge platform and sign in with the same email.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="gitex-email" className="mb-1 block text-sm font-medium">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="gitex-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-[rgba(13,58,29,0.25)] px-3 py-2 text-sm outline-none ring-[#0d3a1d] focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="gitex-code" className="mb-1 block text-sm font-medium">
              Coupon code <span className="text-red-600">*</span>
            </label>
            <input
              id="gitex-code"
              name="couponCode"
              type="text"
              required
              placeholder="CB-GITEX-15-XXXX"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="w-full rounded-md border border-[rgba(13,58,29,0.25)] px-3 py-2 font-mono text-sm outline-none ring-[#0d3a1d] focus:ring-2"
            />
          </div>
          {errorKey ? (
            <p className="text-sm text-red-700" role="alert">
              {ERROR_COPY[errorKey] ?? ERROR_COPY.activation_failed}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-[#0d3a1d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2d17] disabled:opacity-60"
          >
            {busy ? "Unlocking…" : "Unlock Access"}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-[#0d3a1d]/70">
        <Link href="/pricing" className="underline underline-offset-2">
          Back to pricing
        </Link>
      </p>
    </main>
  );
}
