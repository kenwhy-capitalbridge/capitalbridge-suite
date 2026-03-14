"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial (7 Days)",
  monthly: "Monthly (30 Days)",
  quarterly: "Quarterly (90 Days)",
  strategic: "Strategic Execution (365 Days)",
};

function SignupContent() {
  const searchParams = useSearchParams();
  const plan = useMemo(() => searchParams.get("plan") ?? "", [searchParams]);
  const planLabel = plan ? (PLAN_LABELS[plan] ?? plan) : "—";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Supabase is the source of truth: user entry is created only in Supabase Auth.
    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If a plan (e.g. trial) was selected, send user to confirm-payment to pay via Billplz; after payment they are redirected to platform.
    if (plan) {
      window.location.href = `/confirm-payment?plan=${encodeURIComponent(plan)}`;
      return;
    }
    window.location.href = "https://platform.thecapitalbridge.com/dashboard";
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card">
        <h1 className="cb-card-title">Create an Account</h1>
        <p className="cb-card-subtitle">Selected Plan: {planLabel}</p>
        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
          <a className="cb-link" href="/pricing">
            &larr; View Other Plans
          </a>
        </p>

        {!isSupabaseConfigured && (
          <p className="cb-message-error" style={{ marginTop: "1rem" }}>
            Supabase env vars are not configured for this environment.
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: "1.75rem", display: "grid", gap: "1rem" }}>
          {error && <p className="cb-message-error">{error}</p>}

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Email</span>
            <input className="cb-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Password</span>
            <input
              className="cb-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>

          <button className="cb-btn-primary" type="submit" disabled={loading || !isSupabaseConfigured}>
            {loading ? "Creating…" : "Sign Up"}
          </button>
        </form>

        <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.9 }}>
          Already have an account? <a className="cb-link" href="/login">Log In</a>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card">
          <h1 className="cb-card-title">Create an Account</h1>
          <p style={{ marginTop: "1rem", opacity: 0.9 }}>Loading…</p>
        </div>
      </main>
    }>
      <SignupContent />
    </Suspense>
  );
}

