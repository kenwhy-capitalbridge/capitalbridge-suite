"use client";

import { useCallback, useState } from "react";
import { createAppBrowserClient, isSupabaseConfigured } from "@cb/supabase/browser";

const FORM_EMAIL_INVALID = "Enter a valid email address.";
const EMAIL_CHANGE_CHECK_INBOX =
  "Check your new inbox for a confirmation link from Capital Bridge. Your sign-in email updates after you confirm.";
const EMAIL_CHANGE_GENERIC =
  "We could not update your email right now. Please try again or contact support if this continues.";

type Props = {
  currentEmail: string | null;
};

export function ProfileAccountEmailForm({ currentEmail }: Props) {
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const em = newEmail.trim().toLowerCase();
    setMessage(null);
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError(FORM_EMAIL_INVALID);
      return;
    }

    const cur = currentEmail?.trim().toLowerCase();
    if (cur && em === cur) {
      setError("That is already your registered email.");
      return;
    }

    setBusy(true);
    try {
      if (!isSupabaseConfigured) {
        setError(EMAIL_CHANGE_GENERIC);
        return;
      }

      const supabase = createAppBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("Your session expired. Sign in again to change your email.");
        return;
      }

      const { error: updErr } = await supabase.auth.updateUser({ email: em });
      if (updErr) {
        setError(updErr.message || EMAIL_CHANGE_GENERIC);
        return;
      }

      setMessage(EMAIL_CHANGE_CHECK_INBOX);
      setNewEmail("");
    } finally {
      setBusy(false);
    }
  }, [currentEmail, newEmail]);

  return (
    <section
      style={{
        marginTop: "1.75rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid rgba(255, 204, 106, 0.28)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: "1rem",
          fontWeight: 700,
          fontFamily: 'ui-serif, "Roboto Serif", Georgia, serif',
          color: "rgba(246, 245, 241, 0.95)",
        }}
      >
        Change sign-in email
      </h2>
      <p
        style={{
          margin: "0.6rem 0 0",
          fontSize: "0.82rem",
          lineHeight: 1.5,
          color: "rgba(246, 245, 241, 0.72)",
        }}
      >
        We will send a confirmation link to the new address. Your login email does not change until you confirm.
      </p>

      <label
        htmlFor="profile-new-email"
        style={{
          display: "block",
          marginTop: "1.1rem",
          fontSize: "0.72rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(255, 204, 106, 0.88)",
        }}
      >
        New email
      </label>
      <input
        id="profile-new-email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={newEmail}
        disabled={busy}
        onChange={(e) => {
          setNewEmail(e.target.value);
          setError(null);
          setMessage(null);
        }}
        style={{
          marginTop: "0.35rem",
          width: "100%",
          maxWidth: 420,
          boxSizing: "border-box",
          padding: "0.55rem 0.75rem",
          fontSize: "0.95rem",
          color: "rgba(13, 58, 29, 0.95)",
          backgroundColor: "rgba(255, 252, 245, 0.98)",
          border: "1px solid rgba(255, 204, 106, 0.35)",
          borderRadius: 6,
        }}
      />

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        style={{
          marginTop: "0.85rem",
          padding: "0.45rem 1.1rem",
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(13, 58, 29, 0.95)",
          backgroundColor: "rgba(255, 204, 106, 0.92)",
          border: "1px solid rgba(255, 204, 106, 0.55)",
          borderRadius: 4,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.65 : 1,
        }}
      >
        {busy ? "Sending…" : "Request email change"}
      </button>

      {message && (
        <p
          style={{
            margin: "0.85rem 0 0",
            padding: "0.65rem 0.75rem",
            fontSize: "0.82rem",
            lineHeight: 1.45,
            color: "rgba(13, 58, 29, 0.92)",
            backgroundColor: "rgba(255, 204, 106, 0.2)",
            border: "1px solid rgba(255, 204, 106, 0.35)",
            borderRadius: 6,
            maxWidth: 520,
          }}
        >
          {message}
        </p>
      )}
      {error && (
        <p
          style={{
            margin: "0.85rem 0 0",
            fontSize: "0.82rem",
            lineHeight: 1.45,
            color: "rgba(255, 214, 180, 0.98)",
            maxWidth: 520,
          }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
