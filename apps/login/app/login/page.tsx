"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const PLATFORM_URL = "https://platform.thecapitalbridge.com";

/** Map Supabase auth errors to user-friendly messages shown in the login box. */
function getLoginErrorMessage(err: { message?: string; code?: string }): string {
  const msg = (err.message ?? "").toLowerCase();
  const code = (err.code ?? "").toLowerCase();

  if (code === "invalid_login_credentials" || msg.includes("invalid login credentials")) {
    return "Wrong email or password. Please try again.";
  }
  if (code === "user_not_found" || msg.includes("user not found")) {
    return "No account found with this email.";
  }
  if (code === "invalid_credentials" || msg.includes("invalid credentials")) {
    return "Wrong email or password. Please try again.";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Email not confirmed. Please check your inbox for the confirmation link.";
  }
  if (code === "user_banned" || msg.includes("banned")) {
    return "This account has been disabled. Contact support.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }

  return err.message ?? "Login failed. Please try again.";
}

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => searchParams.get("redirectTo"), [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const destination =
    redirectTo && redirectTo.startsWith(PLATFORM_URL)
      ? redirectTo
      : `${PLATFORM_URL}/dashboard`;

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => {
      window.location.href = destination;
    }, 2000);
    return () => clearTimeout(t);
  }, [success, destination]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(getLoginErrorMessage(signInError));
      return;
    }

    // Register this session in public.user_sessions (one session per account; IP/UA stored for matching).
    try {
      await fetch("/api/register-session", { method: "POST", credentials: "include" });
    } catch {
      // Non-blocking; session still valid
    }

    // Check membership: if expired, show message and link to pricing to renew (user stays logged in).
    try {
      const res = await fetch("/api/membership-status", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (data.active === false) {
        setLoading(false);
        setError("Membership expired.");
        return;
      }
    } catch {
      // If check fails, still allow redirect; platform will gate access
    }

    setLoading(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card text-center">
          <h1 className="cb-card-title">Login Successful</h1>
          <p className="cb-card-subtitle mt-2">
            Proceeding to platform.thecapitalbridge.com…
          </p>
          <p className="mt-4 text-sm text-cb-green/70">Redirecting in 2 seconds.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card">
        <h1 className="cb-card-title">Capital Bridge Advisory Platform</h1>
        <p className="cb-card-subtitle">Log In To Your Account</p>

        {!isSupabaseConfigured && (
          <p className="cb-message-error" style={{ marginTop: "1rem" }}>
            Supabase env vars are not configured for this environment.
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: "1.75rem", display: "grid", gap: "1rem" }}>
          {error && (
            <div>
              <p className="cb-message-error">{error}</p>
              {error === "Membership expired." && (
                <p style={{ marginTop: "0.75rem" }}>
                  <a className="cb-link" href="/pricing">
                    Go to pricing to select a membership to renew
                  </a>
                </p>
              )}
            </div>
          )}

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
            {loading ? "Signing In…" : "Login"}
          </button>

          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", opacity: 0.9 }}>
            <a className="cb-link" href="/forgot-password">
              Forgot Password?
            </a>
          </p>
        </form>

        <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.9 }}>
          Don&apos;t have an account?{" "}
          <a className="cb-link" href="/pricing">
            Sign Up
          </a>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card">
          <h1 className="cb-card-title">Capital Bridge Advisory Platform</h1>
          <p className="cb-card-subtitle">Log In To Your Account</p>
          <p style={{ marginTop: "1rem", opacity: 0.9 }}>Loading…</p>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}

