"use client";

import { useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

// Must match exactly a URL in Supabase Dashboard → Auth → URL Configuration → Redirect URLs (no trailing slash)
const RESET_PASSWORD_PATH = "/reset-password";
function getResetPasswordRedirectUrl(): string {
  if (typeof window === "undefined")
    return `${process.env.NEXT_PUBLIC_LOGIN_APP_URL ?? "https://login.thecapitalbridge.com"}${RESET_PASSWORD_PATH}`;
  const origin = window.location.origin;
  return `${origin}${RESET_PASSWORD_PATH}`;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const redirectTo = getResetPasswordRedirectUrl();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
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
        <div className="cb-card text-center">
          <h1 className="cb-card-title">Check your email</h1>
          <p className="cb-card-subtitle mt-2">
            If an account exists for <strong>{email}</strong>, a password reset link will be sent there.
            Check your inbox and spam folder, and allow a few minutes for delivery.
          </p>
          <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.9 }}>
            <Link className="cb-link" href="/login">
              Back to login
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card">
        <h1 className="cb-card-title">Forgot Password</h1>
        <p className="cb-card-subtitle">Enter your email and we&apos;ll send you a reset link.</p>

        {!isSupabaseConfigured && (
          <p className="cb-message-error" style={{ marginTop: "1rem" }}>
            Supabase env vars are not configured for this environment.
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

          <button className="cb-btn-primary" type="submit" disabled={loading || !isSupabaseConfigured}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.9 }}>
          <Link className="cb-link" href="/login">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
