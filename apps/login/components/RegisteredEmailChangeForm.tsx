"use client";

import { useCallback, useState } from "react";
import { isSupabaseConfigured, recoverySupabase, supabase } from "@/lib/supabaseClient";

const inputClass =
  "w-full rounded-xl border border-cb-green/20 bg-white px-4 py-3 text-sm text-cb-green placeholder-cb-green/50 shadow-sm";
const btnSubmitClass =
  "w-full rounded-xl border-2 border-cb-gold/50 bg-white/90 px-4 py-3 text-center text-sm font-medium text-cb-green transition hover:scale-[1.01] hover:bg-cb-cream disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100";

/**
 * Lets the user request a Supabase email change: server-backed when `billId` is present
 * (admin update + billing row sync), otherwise `auth.updateUser` when a recovery session exists.
 */
export function RegisteredEmailChangeForm({
  billId,
  checkoutPlan,
  className = "",
}: {
  billId: string | null | undefined;
  checkoutPlan?: string | null;
  /** Optional; e.g. `mt-0` when wrapped in a section with its own spacing */
  className?: string;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const em = newEmail.trim().toLowerCase();
    setMessage(null);
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);

    try {
      if (billId) {
        const res = await fetch("/api/billing/request-email-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bill_id: billId, new_email: em }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (!res.ok) {
          if (data.error === "same_email") {
            setError("That’s already the email on this payment.");
          } else {
            setError(data.message ?? data.error ?? "Could not update email. Try again or contact support.");
          }
          return;
        }
        setMessage("Check your new inbox for a confirmation email from Supabase to finish the change.");
        setNewEmail("");
        return;
      }

      if (!isSupabaseConfigured) {
        setError("Sign-in isn’t configured in this environment.");
        return;
      }

      let authClient = recoverySupabase;
      let session = (await authClient.auth.getSession()).data.session;
      if (!session?.user) {
        authClient = supabase;
        session = (await authClient.auth.getSession()).data.session;
      }

      if (!session?.user) {
        setError(
          "To use a different email, start checkout again with the address you want — or sign in if you already have an account."
        );
        return;
      }

      const { error: updErr } = await authClient.auth.updateUser({ email: em });
      if (updErr) {
        setError(updErr.message);
        return;
      }

      setMessage("Check your new inbox for a confirmation email to finish the change.");
      setNewEmail("");
    } finally {
      setBusy(false);
    }
  }, [billId, newEmail]);

  return (
    <div className={["mt-4 w-full text-left", className].filter(Boolean).join(" ")}>
      <label htmlFor="registered-email-reset" className="block text-xs font-medium text-cb-green/75">
        Reset Email Address
      </label>
      <input
        id="registered-email-reset"
        type="email"
        autoComplete="email"
        placeholder="new.email@example.com"
        className={`${inputClass} mt-1.5`}
        value={newEmail}
        onChange={(e) => {
          setNewEmail(e.target.value);
          setError(null);
          setMessage(null);
        }}
        disabled={busy}
      />
      <button type="button" className={`${btnSubmitClass} mt-3`} onClick={() => void submit()} disabled={busy}>
        {busy ? "Sending…" : "Send Email Change"}
      </button>
      {message && (
        <p className="mt-3 rounded-lg bg-cb-green/10 px-3 py-2 text-center text-sm font-medium text-cb-green">
          {message}
        </p>
      )}
      {error && <p className="cb-message-error mt-2 text-center text-sm">{error}</p>}
    </div>
  );
}
