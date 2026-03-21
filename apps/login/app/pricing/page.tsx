"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/** Checkout plan slugs — must match `apps/login/app/checkout` and API billing. */
type CheckoutPlanId = "trial" | "monthly" | "quarterly" | "strategic";

type PlanConfig = {
  id: CheckoutPlanId;
  name: string;
  price: number;
  priceSuffix: string;
  billingFrequency: string;
  benefits: string[];
  highlight?: boolean;
  badge?: string;
};

const PLANS: PlanConfig[] = [
  {
    id: "quarterly",
    name: "Quarterly Access",
    price: 3900,
    priceSuffix: "",
    billingFrequency: "Every 90 days",
    badge: "Most popular",
    highlight: true,
    benefits: [
      "Weekly high-conviction trade ideas",
      "Direct access to market insights",
      "Institutional-level analysis, simplified",
      "Stress-test income and capital before you commit",
      "Know what to do next — not just what happened last",
    ],
  },
  {
    id: "trial",
    name: "Trial Access",
    price: 1,
    priceSuffix: "",
    billingFrequency: "7 days · verification charge",
    benefits: [
      "Try the advisory dashboard and models",
      "See how your capital holds up under stress",
      "Low-cost way to explore before you commit",
    ],
  },
  {
    id: "monthly",
    name: "Monthly Access",
    price: 1399,
    priceSuffix: "",
    billingFrequency: "Billed monthly",
    benefits: [
      "Full platform access for 30 days",
      "Flexible — stay only as long as you need",
      "Same advisory framework, month to month",
    ],
  },
  {
    id: "strategic",
    name: "Strategic Advisory & Execution",
    price: 4999,
    priceSuffix: "",
    billingFrequency: "365-day access",
    benefits: [
      "Full-year strategic advisory access",
      "Partner financing & leverage options (where applicable)",
      "Curated private & strategic opportunities",
      "Structured income distribution & execution support",
    ],
  },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "When do I get access?",
    a: "Immediately after payment.",
  },
  {
    q: "Do I need to create an account first?",
    a: "No. You’ll set your password after payment.",
  },
  {
    q: "Can I cancel anytime?",
    a: "You pay for the access period you choose. When it ends, simply renew if you want to continue — no long lock-in on monthly plans.",
  },
  {
    q: "How do I access the platform?",
    a: "You’ll receive an email to activate your account.",
  },
  {
    q: "What if payment fails?",
    a: "You can return here and start again — your plan choice is saved until you complete checkout.",
  },
];

function PlanCard({
  plan,
  onStart,
  loadingPlan,
}: {
  plan: PlanConfig;
  onStart: (id: CheckoutPlanId) => void;
  loadingPlan: string | null;
}) {
  const busy = loadingPlan === plan.id;
  const isHighlight = plan.highlight;

  return (
    <div
      className={`flex flex-col rounded-2xl bg-[#e5e4df] p-6 shadow-lg ${
        isHighlight
          ? "ring-2 ring-cb-gold ring-offset-2 ring-offset-[#0D3A1D] sm:scale-[1.02]"
          : ""
      }`}
    >
      {plan.badge && (
        <div className="mb-2 inline-flex self-center rounded-full bg-cb-gold px-3 py-0.5 text-xs font-medium text-cb-green">
          {plan.badge}
        </div>
      )}
      <h3 className="font-serif text-xl font-semibold text-cb-green">{plan.name}</h3>
      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span className="font-serif text-4xl font-bold text-cb-green">
          RM{plan.price.toLocaleString()}
          {plan.priceSuffix}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-cb-green/80">{plan.billingFrequency}</p>

      <ul className="mt-5 flex-1 space-y-2.5 text-sm text-cb-green">
        {plan.benefits.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-0.5 shrink-0 font-semibold text-[#c4a84a]">✓</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <button
          type="button"
          onClick={() => onStart(plan.id)}
          disabled={!!loadingPlan}
          className="cb-btn-primary w-full disabled:opacity-60"
        >
          {busy ? "Redirecting…" : "Start now"}
        </button>
        <p className="mt-3 text-center text-xs text-cb-green/70">No account needed before payment</p>
      </div>
    </div>
  );
}

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const recentlyExpired = searchParams.get("message") === "recently_expired";
  const paymentFailed = searchParams.get("message") === "payment_unsuccessful";

  const primaryPlan = PLANS.find((p) => p.highlight) ?? PLANS[0];
  const otherPlans = PLANS.filter((p) => !p.highlight);

  function goCheckout(planId: CheckoutPlanId) {
    setLoadingPlan(planId);
    router.replace(`/checkout?plan=${encodeURIComponent(planId)}`);
  }

  useEffect(() => {
    if (loadingPlan) {
      const t = window.setTimeout(() => setLoadingPlan(null), 8000);
      return () => window.clearTimeout(t);
    }
  }, [loadingPlan]);

  return (
    <main className="min-h-screen bg-[#0D3A1D]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        {/* A. Hero */}
        <section className="text-center">
          <h1 className="font-serif text-3xl font-semibold text-cb-gold sm:text-4xl lg:text-5xl">
            Access The Capital Bridge
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-cb-cream/95">
            Institutional-grade insights for serious investors.
          </p>
          <ul className="mx-auto mt-8 max-w-md space-y-3 text-left text-cb-cream/90 sm:mx-auto sm:max-w-lg">
            <li className="flex gap-3">
              <span className="text-cb-gold" aria-hidden>
                ◆
              </span>
              <span>Clear market signals</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cb-gold" aria-hidden>
                ◆
              </span>
              <span>High-conviction ideas</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cb-gold" aria-hidden>
                ◆
              </span>
              <span>Real-time execution insights</span>
            </li>
          </ul>

          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => goCheckout(primaryPlan.id)}
              disabled={!!loadingPlan}
              className="cb-btn-primary px-10 py-3 text-base font-semibold disabled:opacity-60"
            >
              {loadingPlan === primaryPlan.id ? "Redirecting…" : "Get access now"}
            </button>
            <p className="text-sm text-cb-cream/75">Instant access after payment</p>
          </div>
        </section>

        {/* B. Pricing */}
        <section id="pricing" className="mt-20 sm:mt-24">
          <h2 className="text-center font-serif text-2xl font-semibold text-cb-gold sm:text-3xl">
            Choose your access
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-cb-cream/80">
            One clear next step: pick a plan and pay securely. We&apos;ll email you to finish setup.
          </p>

          {recentlyExpired && (
            <div className="cb-message-error mt-8 max-w-2xl rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-amber-900">
              Your access has recently expired. Choose a plan below to continue.
            </div>
          )}
          {paymentFailed && (
            <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-center text-amber-900">
              Payment wasn&apos;t completed. Select a plan below to try again.
            </div>
          )}
          {/* Focus card */}
          <div className="mx-auto mt-10 max-w-lg">
            {primaryPlan && (
              <PlanCard plan={primaryPlan} onStart={goCheckout} loadingPlan={loadingPlan} />
            )}
          </div>

          {/* Secondary plans */}
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {otherPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onStart={goCheckout} loadingPlan={loadingPlan} />
            ))}
          </div>
        </section>

        {/* C. Trust */}
        <section className="mt-20 border-t border-cb-gold/20 pt-16 text-center sm:mt-24">
          <h2 className="font-serif text-2xl font-semibold text-cb-gold sm:text-3xl">
            Trusted by serious investors
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-cb-cream/85">
            Built for disciplined investors who value clarity over noise.
          </p>
        </section>

        {/* D. FAQ */}
        <section className="mt-16 sm:mt-20">
          <h2 className="text-center font-serif text-2xl font-semibold text-cb-gold sm:text-3xl">
            Questions
          </h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-cb-cream/15 bg-cb-cream/5 px-5 py-4 text-left"
              >
                <summary className="cursor-pointer font-medium text-cb-cream marker:text-cb-gold">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-cb-cream/80">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-14 text-center text-sm text-cb-cream/70">
          <Link href="/access" className="cb-btn-view-plans inline-flex">
            Continue to your account
          </Link>
          {" · "}
          <a
            href="https://thecapitalbridge.com/advisory-platform/"
            className="text-cb-gold hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Home
          </a>
        </p>
      </div>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0D3A1D]">
          <p className="text-cb-cream/80">Loading…</p>
        </main>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
