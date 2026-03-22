"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  ACCESS_EMAIL_COOLDOWN_SEC,
  ACCESS_EMAIL_SENDING_LABEL,
} from "@/lib/resendAccessEmail";
import {
  buildAccessUrl,
  persistBillplzBillId,
  persistCheckoutEmail,
  readPersistedCheckoutEmail,
} from "@/lib/checkoutEmailPersistence";
import { PaymentTargetEmailLine } from "@/components/PaymentTargetEmailCopy";

type BillingStatusResponse = {
  mode?: string;
  bill_id?: string;
  email?: string | null;
  billing_status?: string | null;
  pending_bill_id?: string | null;
  account_ready?: boolean;
  membership_ready?: boolean;
  next_step?: string;
  error?: string;
};

const btnPrimary =
  "w-full rounded-xl bg-cb-gold px-4 py-3.5 text-center text-base font-semibold text-cb-green shadow-lg transition hover:scale-[1.02] hover:bg-cb-green hover:text-white disabled:opacity-50 disabled:hover:scale-100";
const btnSecondary =
  "w-full rounded-xl border-2 border-cb-gold/50 bg-white/90 px-4 py-3 text-center font-medium text-cb-green transition hover:scale-[1.02] hover:bg-white disabled:opacity-50 disabled:hover:scale-100";

function openWebInbox(email: string | null | undefined) {
  const domain = email?.split("@")[1]?.toLowerCase().trim() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") {
    window.open("https://mail.google.com/mail/u/0/#inbox", "_blank", "noopener,noreferrer");
    return;
  }
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) {
    window.open("https://outlook.live.com/mail/", "_blank", "noopener,noreferrer");
    return;
  }
  window.open("https://mail.google.com/mail/u/0/#inbox", "_blank", "noopener,noreferrer");
}

function sendPasswordSetupPrimaryLabel(busy: boolean, cooldownSec: number): string {
  if (busy) return ACCESS_EMAIL_SENDING_LABEL;
  if (cooldownSec > 0) return `Resend in ${cooldownSec}s`;
  return "Send Password Setup Email";
}

function openAccessWithPersistedEmail(e: React.MouseEvent<HTMLAnchorElement>) {
  const em = readPersistedCheckoutEmail();
  if (em) {
    e.preventDefault();
    window.location.href = buildAccessUrl({ email: em });
  }
}

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const paid = searchParams.get("billplz[paid]") === "true";
  const paidAt = searchParams.get("billplz[paid_at]");
  const billId = searchParams.get("billplz[id]");

  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(!!billId);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const [wrongEmail, setWrongEmail] = useState("");
  const [wrongBusy, setWrongBusy] = useState(false);
  const [wrongError, setWrongError] = useState<string | null>(null);
  const [wrongSuccess, setWrongSuccess] = useState<string | null>(null);
  const [wrongCooldown, setWrongCooldown] = useState(0);

  /** Short-lived recovery token (minted server-side when account is ready). */
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [recoveryTokenExp, setRecoveryTokenExp] = useState<number>(0);
  const [recoveryMintBusy, setRecoveryMintBusy] = useState(false);
  const [recoveryMintError, setRecoveryMintError] = useState<string | null>(null);
  const recoveryMintMsgRef = useRef<string | null>(null);
  const recoveryRef = useRef<{ token: string | null; exp: number }>({ token: null, exp: 0 });

  useEffect(() => {
    recoveryRef.current = { token: recoveryToken, exp: recoveryTokenExp };
  }, [recoveryToken, recoveryTokenExp]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (wrongCooldown <= 0) return;
    const t = window.setTimeout(() => setWrongCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [wrongCooldown]);

  useEffect(() => {
    if (billId) persistBillplzBillId(billId);
  }, [billId]);

  useEffect(() => {
    if (!billId) return;

    let cancelled = false;

    if (paid) {
      fetch(`/api/billing/confirm-payment?bill_id=${encodeURIComponent(billId)}`, {
        method: "GET",
        cache: "no-store",
      }).catch(() => {});
    }

    async function pollStatus() {
      if (!billId) return;
      try {
        const res = await fetch(`/api/billing/status?bill_id=${encodeURIComponent(billId)}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as BillingStatusResponse;
        if (!cancelled) {
          setStatus(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [billId, paid]);

  const accountReady = !!status?.account_ready;
  const waitingForWebhook = !accountReady && paid && !!billId;
  const statusEmail = status?.email?.trim() ?? null;

  const mintRecoveryToken = useCallback(async (): Promise<string | null> => {
    if (!billId) return null;
    setRecoveryMintBusy(true);
    setRecoveryMintError(null);
    try {
      const res = await fetch("/api/billing/recovery-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bill_id: billId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        recovery_token?: string;
        expires_at_unix?: number;
        error?: string;
      };
      if (!res.ok) {
        const msg =
          data.error === "rate_limited"
            ? "Too many attempts. Wait a few minutes and try again."
            : data.error === "forbidden_origin"
              ? "Please refresh this page, then try again."
              : data.error === "payment_not_confirmed" || data.error === "membership_not_ready"
                ? "Account isn’t ready yet — this page will update automatically."
                : "Could not prepare email change. Refresh the page or try again shortly.";
        recoveryMintMsgRef.current = msg;
        // Don’t show a red banner for origin issues — avoids duplicate/confusing warnings; submit surfaces one hint if needed.
        setRecoveryMintError(data.error === "forbidden_origin" ? null : msg);
        setRecoveryToken(null);
        setRecoveryTokenExp(0);
        return null;
      }
      const tok = data.recovery_token ?? null;
      const exp = typeof data.expires_at_unix === "number" ? data.expires_at_unix : 0;
      if (tok && exp) {
        recoveryMintMsgRef.current = null;
        setRecoveryMintError(null);
        setRecoveryToken(tok);
        setRecoveryTokenExp(exp);
        recoveryRef.current = { token: tok, exp };
      }
      return tok;
    } catch {
      const msg = "Network error. Check your connection and try again.";
      recoveryMintMsgRef.current = msg;
      setRecoveryMintError(msg);
      setRecoveryToken(null);
      setRecoveryTokenExp(0);
      return null;
    } finally {
      setRecoveryMintBusy(false);
    }
  }, [billId]);

  /** When payment is confirmed and account is ready, mint a recovery token in the background. */
  useEffect(() => {
    if (!accountReady || !billId) return;
    let cancelled = false;
    void (async () => {
      await mintRecoveryToken();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [accountReady, billId, mintRecoveryToken]);

  const ensureValidRecoveryToken = useCallback(async (): Promise<string | null> => {
    const now = Math.floor(Date.now() / 1000);
    const { token, exp } = recoveryRef.current;
    if (token && exp > now + 60) return token;
    return mintRecoveryToken();
  }, [mintRecoveryToken]);

  useEffect(() => {
    if (statusEmail) persistCheckoutEmail(statusEmail);
  }, [statusEmail]);

  /** Password setup email is server-only: requires bill_id; delivery address always from billing_sessions.email. */
  const sendDisabled =
    resendBusy ||
    resendCooldown > 0 ||
    !isSupabaseConfigured ||
    !accountReady ||
    !billId;

  const handleSendSetPasswordEmail = useCallback(async () => {
    setResendError(null);
    if (!isSupabaseConfigured) {
      setResendError("Sign-in isn’t configured in this environment.");
      return;
    }
    if (resendCooldown > 0 || resendBusy) return;
    if (!billId) {
      setResendSuccess(null);
      setResendError(
        "We couldn’t verify your session. Please restart from checkout or contact support."
      );
      return;
    }

    setResendBusy(true);
    try {
      const res = await fetch("/api/billing/send-setup-email-for-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bill_id: billId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        delivery_email?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setResendSuccess(null);
        setResendError(
          data.error === "rate_limited"
            ? "Too many attempts. Wait a few minutes and try again."
            : data.error === "forbidden_origin"
              ? "Please refresh this page, then try again."
              : data.message ?? data.error ?? "Could not send email. Try again."
        );
        return;
      }
      const delivered = data.delivery_email?.trim() ?? "";
      if (!delivered) {
        setResendSuccess(null);
        setResendError(
          "We couldn’t verify your session. Please restart from checkout or contact support."
        );
        return;
      }
      persistCheckoutEmail(delivered);
      setResendSuccess(`Password setup email sent to ${delivered}`);
      setResendCooldown(ACCESS_EMAIL_COOLDOWN_SEC);
      try {
        const st = await fetch(`/api/billing/status?bill_id=${encodeURIComponent(billId)}`, {
          cache: "no-store",
        });
        const next = (await st.json().catch(() => ({}))) as BillingStatusResponse;
        if (st.ok && next?.bill_id) setStatus(next);
      } catch {
        /* ignore */
      }
    } finally {
      setResendBusy(false);
    }
  }, [resendCooldown, resendBusy, billId]);

  const handleWrongEmailSubmit = useCallback(async () => {
    setWrongError(null);
    setWrongSuccess(null);
    if (!billId) return;
    if (!isSupabaseConfigured) {
      setWrongError("Sign-in isn’t configured in this environment.");
      return;
    }
    if (wrongCooldown > 0 || wrongBusy) return;

    const em = wrongEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setWrongError("Enter a valid email address.");
      return;
    }

    setWrongBusy(true);
    try {
      const token = await ensureValidRecoveryToken();
      if (!token) {
        setWrongError(recoveryMintMsgRef.current ?? "Could not secure this step. Refresh the page and try again.");
        return;
      }

      const res = await fetch("/api/billing/recover-correct-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bill_id: billId,
          new_email: em,
          recovery_token: token,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        if (data.error === "same_as_registered") {
          setWrongError("Enter a different email than the one shown above.");
        } else if (data.error === "invalid_recovery_token" || data.error === "recovery_token_mismatch") {
          setWrongError("This link expired. Refresh the page and try again.");
          void mintRecoveryToken();
        } else if (data.error === "rate_limited") {
          setWrongError("Too many attempts. Wait a few minutes and try again.");
        } else {
          setWrongError(data.message ?? data.error ?? "Could not update. Try again or contact support.");
        }
        return;
      }
      persistCheckoutEmail(em);
      setWrongSuccess(`Password setup email sent to ${em}`);
      setWrongCooldown(ACCESS_EMAIL_COOLDOWN_SEC);
      setWrongEmail("");
      try {
        const st = await fetch(`/api/billing/status?bill_id=${encodeURIComponent(billId)}`, { cache: "no-store" });
        const next = (await st.json().catch(() => ({}))) as BillingStatusResponse;
        if (st.ok && next?.bill_id) setStatus(next);
      } catch {
        /* ignore */
      }
    } finally {
      setWrongBusy(false);
    }
  }, [billId, wrongEmail, wrongCooldown, wrongBusy, ensureValidRecoveryToken, mintRecoveryToken]);

  const passwordEmailVariant: "pending" | "sent" =
    accountReady || !!resendSuccess || !!wrongSuccess ? "sent" : "pending";

  const showWrongEmailFix = accountReady && !!statusEmail && !!billId;
  const wrongDisabled =
    wrongBusy ||
    recoveryMintBusy ||
    wrongCooldown > 0 ||
    !wrongEmail.trim() ||
    !isSupabaseConfigured;

  const emailActions = (
    <>
      {billId && (
        <p className="mt-1 text-center text-[11px] leading-relaxed text-cb-green/50">
          Payment reference — keep this page or save your Bill ID (support may ask for it):<br />
          <span className="font-mono text-cb-green/65">Bill ID: {billId}</span>
        </p>
      )}
      {statusEmail && (
        <PaymentTargetEmailLine
          email={statusEmail}
          variant={passwordEmailVariant}
          className="mt-4 text-center text-sm"
        />
      )}
      {resendSuccess && (
        <p className="mt-4 rounded-lg bg-cb-green/10 px-3 py-2 text-sm font-medium text-cb-green">{resendSuccess}</p>
      )}
      {resendError && <p className="cb-message-error mt-3 text-left text-sm">{resendError}</p>}
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={sendDisabled}
          onClick={() => void handleSendSetPasswordEmail()}
        >
          {sendPasswordSetupPrimaryLabel(resendBusy, resendCooldown)}
        </button>
        <button type="button" className={btnSecondary} onClick={() => openWebInbox(statusEmail)}>
          Open Email Inbox
        </button>
      </div>
      {showWrongEmailFix && (
        <div className="mt-6 border-t border-cb-green/15 pt-5 text-left">
          <p className="text-center text-sm text-cb-green/80">Not your email? Enter the correct one below.</p>
          <p className="mt-2 text-center text-sm leading-relaxed text-cb-green/75">
            Used the wrong email? No problem. Enter the correct one and we&apos;ll send your access link there.
          </p>
          {recoveryMintError && (
            <p className="cb-message-error mt-2 text-center text-sm">{recoveryMintError}</p>
          )}
          <label className="mt-3 block text-xs font-medium text-cb-green/75" htmlFor="payment-return-wrong-email">
            Correct email
          </label>
          <input
            id="payment-return-wrong-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="cb-input mt-1.5"
            value={wrongEmail}
            onChange={(e) => {
              setWrongEmail(e.target.value);
              setWrongError(null);
              setWrongSuccess(null);
            }}
            disabled={wrongBusy}
          />
          <button
            type="button"
            className={`${btnPrimary} mt-3`}
            disabled={wrongDisabled}
            onClick={() => void handleWrongEmailSubmit()}
          >
            {wrongBusy
              ? ACCESS_EMAIL_SENDING_LABEL
              : wrongCooldown > 0
                ? `Resend in ${wrongCooldown}s`
                : "Send Password Setup Email"}
          </button>
          {!wrongSuccess && (
            <p className="mt-3 text-center text-sm leading-relaxed text-cb-green/75">
              Your access will be linked to this email.
            </p>
          )}
          {wrongSuccess && (
            <p className="mt-3 rounded-lg bg-cb-green/10 px-3 py-2 text-center text-sm font-medium text-cb-green">
              {wrongSuccess}
            </p>
          )}
          {wrongError && <p className="cb-message-error mt-2 text-sm">{wrongError}</p>}
        </div>
      )}
    </>
  );

  if (!billId) {
    return (
      <main className="cb-auth-main">
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Payment</h1>
          <p className="cb-card-subtitle mt-2">
            If you just paid, go back to the tab from checkout or check the email you used there.
          </p>
          <p className="mt-3 text-sm text-cb-green/80">
            To set your password or send the link again, open{" "}
            <a
              href="/access"
              className="font-semibold text-cb-green underline"
              onClick={openAccessWithPersistedEmail}
            >
              account access
            </a>{" "}
            — your email may be filled in automatically — then tap Send Password Set Up Email Again.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" className={btnPrimary} onClick={() => openWebInbox(null)}>
              Open Gmail
            </button>
            <p className="text-sm text-cb-green/75">Or check your email app</p>
          </div>
        </div>
      </main>
    );
  }

  if (loading || waitingForWebhook) {
    return (
      <main className="cb-auth-main">
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Securing your access…</h1>
          <p className="cb-card-subtitle mt-2">
            {paid
              ? "We're confirming your payment. This usually takes just a moment."
              : "Checking your payment status…"}
          </p>
          {paidAt && <p className="mt-4 text-sm text-cb-green/75">Paid at: {paidAt}</p>}
          {waitingForWebhook && (
            <p className="mt-4 text-sm text-cb-green/80">This page updates automatically every few seconds.</p>
          )}
        </div>
      </main>
    );
  }

  if (accountReady) {
    return (
      <main className="cb-auth-main">
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Your Account is Ready.</h1>
          {statusEmail ? (
            emailActions
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-cb-green/80">
              We couldn&apos;t load your email on this screen. Open{" "}
              <a
                href="/access"
                className="font-semibold underline"
                onClick={openAccessWithPersistedEmail}
              >
                account access
              </a>{" "}
              and use Send password link again with the address you used at checkout.
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="cb-auth-main">
      <div className="cb-card max-w-md text-center">
        <h1 className="cb-card-title">Payment pending</h1>
        <p className="cb-card-subtitle mt-2 text-sm leading-relaxed">
          We couldn&apos;t confirm payment from this page yet. When your email appears below, use Send Password Setup Email
          to get a link — even if the first email never arrived.
        </p>
        {billId && (
          <p className="mt-4 text-xs text-cb-green/55">
            Bill ID: <span className="font-mono">{billId}</span>
          </p>
        )}
        {status?.next_step === "contact_support" && (
          <p className="cb-message-error mt-4 text-sm">
            We couldn&apos;t match this payment yet. Contact support with the reference above.
          </p>
        )}
        {statusEmail ? (
          emailActions
        ) : (
          <p className="mt-4 text-sm text-cb-green/85">
            This page will refresh with your email shortly. You can also open{" "}
            <a href="/access" className="font-semibold underline" onClick={openAccessWithPersistedEmail}>
              account access
            </a>{" "}
            and use Send Password Set Up Email Again.
          </p>
        )}
      </div>
    </main>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="cb-auth-main">
          <div className="cb-card max-w-md text-center">
            <h1 className="cb-card-title">Securing your access…</h1>
            <p className="cb-card-subtitle mt-2">One moment.</p>
          </div>
        </main>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
