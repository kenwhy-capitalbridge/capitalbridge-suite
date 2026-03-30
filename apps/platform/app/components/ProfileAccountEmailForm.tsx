"use client";

import { useCallback, useState } from "react";
import { ChromeSpinnerGlyph } from "@cb/ui";
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
        marginTop: "clamp(1.25rem, 3.5vw, 1.75rem)",
        paddingTop: "clamp(1.1rem, 3vw, 1.5rem)",
        borderTop: "1px solid rgba(255, 204, 106, 0.28)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: "clamp(0.88rem, 2.4vw, 1rem)",
          fontWeight: 700,
          fontFamily: 'ui-serif, "Roboto Serif", Georgia, serif',
          color: "rgba(246, 245, 241, 0.95)",
          lineHeight: 1.25,
        }}
      >
        Change sign-in email
      </h2>
      <p
        style={{
          margin: "clamp(0.45rem, 1.5vw, 0.6rem) 0 0",
          fontSize: "clamp(0.74rem, 2.1vw, 0.82rem)",
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
          marginTop: "clamp(0.85rem, 2.5vw, 1.1rem)",
          fontSize: "clamp(0.64rem, 2vw, 0.72rem)",
          fontWeight: 600,
          letterSpacing: "clamp(0.04em, 0.5vw, 0.06em)",
          textTransform: "uppercase",
          color: "rgba(255, 204, 106, 0.88)",
        }}
      >
        New email
      </label>
      <div className="profile-page-email-row">
        <input
          id="profile-new-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={newEmail}
          disabled={busy}
          className="profile-page-email-input"
          onChange={(e) => {
            setNewEmail(e.target.value);
            setError(null);
            setMessage(null);
          }}
          style={{
            flex: "1 1 220px",
            minWidth: "min(100%, 11rem)",
            maxWidth: 420,
            boxSizing: "border-box",
            padding: "clamp(0.5rem, 1.6vw, 0.55rem) clamp(0.6rem, 2vw, 0.75rem)",
            fontSize: "clamp(1rem, 0.82rem + 2vw, 1.05rem)",
            color: "rgba(13, 58, 29, 0.95)",
            backgroundColor: "rgba(255, 252, 245, 0.98)",
            border: "1px solid rgba(255, 204, 106, 0.35)",
            borderRadius: 6,
            minHeight: 44,
          }}
        />

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          aria-busy={busy}
          className="profile-page-email-submit cb-profile-gold-cta-hover"
          style={{
            flexShrink: 0,
            padding: "clamp(0.42rem, 1.4vw, 0.45rem) clamp(0.85rem, 2.5vw, 1.1rem)",
            minHeight: 44,
            fontSize: "clamp(0.62rem, 1.9vw, 0.68rem)",
            fontWeight: 700,
            letterSpacing: "clamp(0.06em, 0.8vw, 0.1em)",
            textTransform: "uppercase",
            color: "rgba(13, 58, 29, 0.95)",
            backgroundColor: "rgba(255, 204, 106, 0.92)",
            border: "2px solid rgba(255, 204, 106, 0.55)",
            borderRadius: 8,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.65 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: busy ? 0 : 6,
            boxSizing: "border-box",
            transition: "background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
            ...(busy ? { minWidth: "12rem" } : {}),
          }}
        >
          {busy ? (
            <>
              <ChromeSpinnerGlyph sizePx={14} />
              <span className="cb-visually-hidden">Sending email change request</span>
            </>
          ) : (
            "Request email change"
          )}
        </button>
      </div>

      {message && (
        <p
          style={{
            margin: "clamp(0.65rem, 2vw, 0.85rem) 0 0",
            padding: "clamp(0.55rem, 1.8vw, 0.65rem) clamp(0.6rem, 2vw, 0.75rem)",
            fontSize: "clamp(0.74rem, 2.1vw, 0.82rem)",
            lineHeight: 1.45,
            color: "rgba(13, 58, 29, 0.92)",
            backgroundColor: "rgba(255, 204, 106, 0.2)",
            border: "1px solid rgba(255, 204, 106, 0.35)",
            borderRadius: 6,
            maxWidth: "min(100%, 520px)",
            boxSizing: "border-box",
          }}
        >
          {message}
        </p>
      )}
      {error && (
        <p
          style={{
            margin: "clamp(0.65rem, 2vw, 0.85rem) 0 0",
            fontSize: "clamp(0.74rem, 2.1vw, 0.82rem)",
            lineHeight: 1.45,
            color: "rgba(255, 214, 180, 0.98)",
            maxWidth: "min(100%, 520px)",
          }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
