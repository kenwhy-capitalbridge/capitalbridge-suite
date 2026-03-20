"use client";

import { useState } from "react";
import { isSupabaseConfigured, recoverySupabase } from "@/lib/supabaseClient";
import { getAccessRedirectUrlForAuthEmails } from "@/lib/authEmailRedirect";

const btnBase =
  "w-full rounded-xl px-4 py-3 font-medium transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100";
const btnPrimary = `${btnBase} cb-btn-primary`;
const btnSecondary = `${btnBase} cb-btn-secondary`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const redirectTo = getAccessRedirectUrlForAuthEmails();
    const { error: resetError } = await recoverySupabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Check your email</h1>
          <p className="cb-card-subtitle mt-2">
            If an account exists for <strong>{email}</strong>, we&apos;ll send a link to get you back in.
          </p>
          <button type="button" className={`${btnPrimary} mt-6`} onClick={() => { window.location.href = "/access"; }}>
            Back to account access
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card max-w-md">
        <h1 className="cb-card-title">Forgot password</h1>
        <p className="cb-card-subtitle">Enter your email and we&apos;ll send you a secure link.</p>

        {!isSupabaseConfigured && (
          <p className="cb-message-error" style={{ marginTop: "1rem" }}>
            Sign-in isn&apos;t configured for this environment.
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: "1.75rem", display: "grid", gap: "1rem" }}>
          {error && <p className="cb-message-error">{error}</p>}

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Email</span>
            <input
              className="cb-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <button className={btnPrimary} type="submit" disabled={loading || !isSupabaseConfigured}>
            {loading ? "Securing your access…" : "Send reset link"}
          </button>
        </form>

        <button type="button" className={`${btnSecondary} mt-4`} onClick={() => { window.location.href = "/access"; }}>
          Back to account access
        </button>
      </div>
    </main>
  );
}
