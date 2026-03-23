"use client";

import { useCallback, useRef, useState } from "react";
import { isSupabaseConfigured, recoverySupabase, supabase } from "@/lib/supabaseClient";
import { CalmAuthMessage } from "@/components/CalmAuthMessage";
import {
  ACCESS_SUPPORT_HINT,
  DEV_PREVIEW_NO_EMAIL,
  EMAIL_CHANGE_CHECK_INBOX,
  EMAIL_CHANGE_NO_SESSION,
  EMAIL_ON_PAYMENT_SAME,
  FORM_EMAIL_INVALID,
  resolveCalmAuthMessage,
} from "@/lib/sanitizeAuthErrorMessage";

const inputClass =
  "w-full rounded-xl border border-cb-green/20 bg-white px-3 py-2.5 text-sm text-cb-green placeholder-cb-green/50 shadow-sm sm:px-4 sm:py-3 sm:text-base";

const calmNoticeClass =
  "rounded-lg border border-amber-200/80 bg-amber-50/95 px-2.5 py-1.5 text-xs text-cb-green sm:px-3 sm:py-2 sm:text-sm";

/**
 * Lets the user request an email change: server-backed when `billId` is present,
 * otherwise `auth.updateUser` when a recovery session exists.
 */
export function RegisteredEmailChangeForm({
  billId,
  checkoutPlan: _checkoutPlan,
  className = "",
  showSupportHint = true,
}: {
  billId: string | null | undefined;
  checkoutPlan?: string | null;
  className?: string;
  /** When false, omit footer hint (parent card already shows it). */
  showSupportHint?: boolean;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emailChangeFailRef = useRef(0);

  const submit = useCallback(async () => {
    const em = newEmail.trim().toLowerCase();
    setMessage(null);
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError(FORM_EMAIL_INVALID);
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
            setError(EMAIL_ON_PAYMENT_SAME);
            return;
          }
          emailChangeFailRef.current += 1;
          const raw = [data.message, data.error].filter(Boolean).join(" ");
          const { message: calm } = resolveCalmAuthMessage(
            "email_change",
            emailChangeFailRef.current,
            raw
          );
          setError(calm);
          return;
        }
        emailChangeFailRef.current = 0;
        setMessage(EMAIL_CHANGE_CHECK_INBOX);
        setNewEmail("");
        return;
      }

      if (!isSupabaseConfigured) {
        setError(DEV_PREVIEW_NO_EMAIL);
        return;
      }

      let authClient = recoverySupabase;
      let session = (await authClient.auth.getSession()).data.session;
      if (!session?.user) {
        authClient = supabase;
        session = (await authClient.auth.getSession()).data.session;
      }

      if (!session?.user) {
        setError(EMAIL_CHANGE_NO_SESSION);
        return;
      }

      const { error: updErr } = await authClient.auth.updateUser({ email: em });
      if (updErr) {
        emailChangeFailRef.current += 1;
        const { message: calm } = resolveCalmAuthMessage(
          "email_change",
          emailChangeFailRef.current,
          updErr.message
        );
        setError(calm);
        return;
      }

      emailChangeFailRef.current = 0;
      setMessage(EMAIL_CHANGE_CHECK_INBOX);
      setNewEmail("");
    } finally {
      setBusy(false);
    }
  }, [billId, newEmail]);

  void _checkoutPlan;

  return (
    <div className={["mt-4 w-full text-left", className].filter(Boolean).join(" ")}>
      <label htmlFor="registered-email-reset" className="block text-sm font-medium text-cb-green/80">
        Reset email address
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
      <button
        type="button"
        className="cb-btn-primary mt-4 w-full font-semibold disabled:opacity-50 sm:mt-5"
        onClick={() => void submit()}
        disabled={busy}
      >
        {busy ? "Sending…" : "Send email change"}
      </button>
      {message && (
        <p className="mt-3 rounded-lg bg-cb-green/10 px-3 py-2 text-center text-sm font-medium text-cb-green">
          {message}
        </p>
      )}
      {error && (
        <div className={`${calmNoticeClass} mt-3 text-center`}>
          <CalmAuthMessage text={error} className="text-sm leading-relaxed text-cb-green" />
        </div>
      )}
      {showSupportHint && (
        <div className="mt-6 border-t border-cb-green/10 pt-5">
          <CalmAuthMessage text={ACCESS_SUPPORT_HINT} className="text-center text-sm leading-relaxed text-cb-green/55" />
        </div>
      )}
    </div>
  );
}
