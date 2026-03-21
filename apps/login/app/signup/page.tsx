"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Payment-first: no frontend signup. Redirect to pricing (or checkout with plan).
 * Users are created only after successful payment via Billplz webhook.
 */
function SignupRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get("plan")?.trim() || null;

  useEffect(() => {
    if (plan) {
      router.replace(`/checkout?plan=${encodeURIComponent(plan)}`);
    } else {
      router.replace("/pricing");
    }
  }, [plan, router]);

  return (
    <main className="cb-auth-main">
      <div className="cb-card">
        <h1 className="cb-card-title">Redirecting…</h1>
        <p className="cb-card-subtitle" style={{ marginTop: "0.5rem" }}>
          Taking you to the pricing page. No account is created until after payment.
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="cb-auth-main">
          <div className="cb-card">
            <h1 className="cb-card-title">Redirecting…</h1>
          </div>
        </main>
      }
    >
      <SignupRedirect />
    </Suspense>
  );
}
