"use client";

import { Suspense, useMemo, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * Same-origin API: all backend runs on login.thecapitalbridge.com/api/*
 * No cross-domain calls, so no CORS or preflight issues.
 */
function ConfirmPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = useMemo(() => searchParams.get("plan") ?? "trial", [searchParams]);
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Supabase is the source of truth: require a valid user from Supabase before creating a bill.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) router.replace(`/signup?plan=${encodeURIComponent(plan)}`);
        return;
      }

      try {
        const res = await fetch("/api/bill/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ plan }),
        });

        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok) {
          setError((data?.error as string) ?? "Could not create payment.");
          setStatus("error");
          return;
        }

        const checkoutUrl = data?.checkoutUrl;
        if (checkoutUrl && typeof checkoutUrl === "string") {
          setStatus("redirecting");
          window.location.href = checkoutUrl;
          return;
        }

        setError("Invalid response from server.");
        setStatus("error");
      } catch {
        if (!cancelled) {
          setError("Network error. Please try again.");
          setStatus("error");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [plan, router]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card">
        {status === "loading" && (
          <>
            <h1 className="cb-card-title">Preparing your payment</h1>
            <p className="cb-card-subtitle">Plan: {plan}</p>
            <p style={{ marginTop: "1rem", opacity: 0.9 }}>Redirecting to payment…</p>
          </>
        )}
        {status === "redirecting" && (
          <>
            <h1 className="cb-card-title">Redirecting to payment</h1>
            <p style={{ marginTop: "1rem", opacity: 0.9 }}>
              Completing RM1 trial payment. You will be sent to the platform after successful payment.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="cb-card-title">Payment setup failed</h1>
            <p className="cb-message-error" style={{ marginTop: "1rem" }}>
              {error}
            </p>
            <p style={{ marginTop: "1rem" }}>
              <a className="cb-link" href="/pricing">
                Back to pricing
              </a>
              {" · "}
              <a className="cb-link" href="/login">
                Log In
              </a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function ConfirmPaymentPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card">
          <h1 className="cb-card-title">Preparing your payment</h1>
          <p style={{ marginTop: "1rem", opacity: 0.9 }}>Loading…</p>
        </div>
      </main>
    }>
      <ConfirmPaymentContent />
    </Suspense>
  );
}
