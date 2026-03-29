"use client";

import { Suspense, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ButtonSpinner } from "@/components/ButtonSpinner";

/**
 * Payment-first: redirect to checkout (enter email, create billing session, then Billplz).
 * No user required; account is created after payment via webhook.
 */
function ConfirmPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = useMemo(() => searchParams.get("plan") ?? "trial", [searchParams]);

  useEffect(() => {
    router.replace(`/checkout?plan=${encodeURIComponent(plan)}`);
  }, [plan, router]);

  return (
    <main className="cb-auth-main">
      <div className="cb-card">
        <h1 className="cb-card-title">Redirecting…</h1>
        <p className="cb-card-subtitle">Plan: {plan}</p>
        <p style={{ marginTop: "1rem", opacity: 0.9 }}>Taking you to checkout.</p>
      </div>
    </main>
  );
}

export default function ConfirmPaymentPage() {
  return (
    <Suspense
      fallback={
        <main className="cb-auth-main">
          <div className="cb-card">
            <h1 className="cb-card-title">Preparing your payment</h1>
            <p style={{ marginTop: "1rem", opacity: 0.9 }}>Loading…</p>
            <div className="mt-4 flex justify-center" role="status" aria-busy="true">
              <ButtonSpinner className="h-6 w-6 border-cb-green/25 border-t-cb-green sm:h-7 sm:w-7" />
            </div>
          </div>
        </main>
      }
    >
      <ConfirmPaymentContent />
    </Suspense>
  );
}
