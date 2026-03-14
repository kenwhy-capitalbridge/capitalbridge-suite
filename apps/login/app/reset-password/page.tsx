"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  // On load: exchange recovery token from URL hash so we can call updateUser()
  useEffect(() => {
    async function run() {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const search = typeof window !== "undefined" ? window.location.search : "";
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const searchParams = new URLSearchParams(search);
      const type = params.get("type");
      const hasRecoveryToken = type === "recovery" || hash.includes("type=recovery");
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        setInvalidLink(!!exchangeError);
        setReady(true);
        return;
      }

      // Trigger Supabase to read the hash and exchange the recovery token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (hasRecoveryToken) {
        // After getSession(), Supabase will have exchanged the hash; we're ready to show the form
        setReady(true);
        if (sessionError) setInvalidLink(true);
        return;
      }

      if (session) {
        setReady(true);
        return;
      }
      setInvalidLink(true);
      setReady(true);
    }

    run();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card text-center">
          <h1 className="cb-card-title">Password updated</h1>
          <p className="cb-card-subtitle mt-2">You can now sign in with your new password.</p>
          <p style={{ marginTop: "1rem" }}>
            <Link className="cb-btn-primary inline-block" href="/login">
              Back to login
            </Link>
          </p>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card text-center">
          <p className="cb-card-subtitle">Loading…</p>
        </div>
      </main>
    );
  }

  if (invalidLink) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card text-center">
          <h1 className="cb-card-title">Invalid or expired link</h1>
          <p className="cb-card-subtitle mt-2">
            Use the link from your password reset email to set a new password. Links expire after a short time.
          </p>
          <p className="cb-message-error mt-4 text-left text-sm">
            If the link brought you to the login page instead of here, add this exact URL to Supabase: Auth → URL
            Configuration → Redirect URLs: <strong>{typeof window !== "undefined" ? window.location.origin + "/reset-password" : "/reset-password"}</strong>
          </p>
          <p style={{ marginTop: "1rem" }}>
            <Link className="cb-link" href="/forgot-password">
              Send a new reset link
            </Link>
            {" · "}
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
        <h1 className="cb-card-title">Set new password</h1>
        <p className="cb-card-subtitle">Enter your new password below.</p>

        {!isSupabaseConfigured && (
          <p className="cb-message-error" style={{ marginTop: "1rem" }}>
            Supabase env vars are not configured for this environment.
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: "1.75rem", display: "grid", gap: "1rem" }}>
          {error && <p className="cb-message-error">{error}</p>}

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>New password</span>
            <input
              className="cb-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Confirm password</span>
            <input
              className="cb-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              required
              minLength={6}
            />
          </label>

          <button className="cb-btn-primary" type="submit" disabled={loading || !isSupabaseConfigured}>
            {loading ? "Updating…" : "Update password"}
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
