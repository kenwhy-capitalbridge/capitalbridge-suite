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

type OnboardMode = "confirmation" | "processing" | "ready";

/** Spec: single primary control style across phases */
const primaryBtnClass =
  "w-full mt-6 rounded-lg bg-neutral-900 px-4 py-3 text-center text-base font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryBtnClass =
  "w-full mt-3 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-center text-base font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50";

const shellClass = "min-h-screen flex items-center justify-center bg-neutral-50 px-4";
const cardClass =
  "w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm";
const titleClass = "text-center text-xl font-semibold text-neutral-900";
const bodyClass = "mt-2 text-center text-base text-neutral-600";
const metaClass = "mt-2 text-center text-sm text-neutral-500";

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

  const [finalData, setFinalData] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(!!billId);
  const [onboardMode, setOnboardMode] = useState<OnboardMode>("confirmation");
  const [stageIndex, setStageIndex] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);
  const [processingWaitHint, setProcessingWaitHint] = useState(false);

  const finalDataRef = useRef<BillingStatusResponse | null>(null);
  finalDataRef.current = finalData;

  const [resendBusy, setResendBusy] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const [wrongEmail, setWrongEmail] = useState("");
  const [wrongBusy, setWrongBusy] = useState(false);
  const [wrongError, setWrongError] = useState<string | null>(null);
  const [wrongSuccess, setWrongSuccess] = useState<string | null>(null);
  const [wrongCooldown, setWrongCooldown] = useState(0);

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

  const fetchStatusOnce = useCallback(async (): Promise<BillingStatusResponse | null> => {
    if (!billId) return null;
    try {
      const res = await fetch(`/api/billing/status?bill_id=${encodeURIComponent(billId)}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as BillingStatusResponse;
      setFinalData(data);
      return data;
    } catch {
      return null;
    }
  }, [billId]);

  /** Initial load: confirm-payment + status (unchanged endpoints). No interval polling; no standalone delayed refetch — staged retries live only in the processing phase. */
  useEffect(() => {
    if (!billId) return;

    let cancelled = false;

    if (paid) {
      fetch(`/api/billing/confirm-payment?bill_id=${encodeURIComponent(billId)}`, {
        method: "GET",
        cache: "no-store",
      }).catch(() => {});
    }

    void (async () => {
      await fetchStatusOnce();
      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [billId, paid, fetchStatusOnce]);

  const accountReady = !!finalData?.account_ready;
  const statusEmail = finalData?.email?.trim() ?? null;
  const deliveryEmail = statusEmail;

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
        if (st.ok && next?.bill_id) setFinalData(next);
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
        if (st.ok && next?.bill_id) setFinalData(next);
      } catch {
        /* ignore */
      }
    } finally {
      setWrongBusy(false);
    }
  }, [billId, wrongEmail, wrongCooldown, wrongBusy, ensureValidRecoveryToken, mintRecoveryToken]);

  const showWrongEmailFix = accountReady && !!deliveryEmail && !!billId;
  const wrongDisabled =
    wrongBusy ||
    recoveryMintBusy ||
    wrongCooldown > 0 ||
    !wrongEmail.trim() ||
    !isSupabaseConfigured;

  /** Phase 2: staged timing via chained setTimeouts only (no setInterval). */
  useEffect(() => {
    if (onboardMode !== "processing") return;

    setStageIndex(0);
    setProgressWidth(0);
    setProcessingWaitHint(false);

    const tProgress1 = window.setTimeout(() => setProgressWidth(33), 80);
    const tStage1 = window.setTimeout(() => {
      setStageIndex(1);
      setProgressWidth(33);
    }, 2000);
    const tProgress2 = window.setTimeout(() => setProgressWidth(66), 2000 + 80);
    const tStage2 = window.setTimeout(() => {
      setStageIndex(2);
      setProgressWidth(66);
    }, 2000 + 3500);
    const tProgress3 = window.setTimeout(() => setProgressWidth(100), 2000 + 3500 + 80);
    const tStage3 = window.setTimeout(() => {
      setStageIndex(3);
      setProgressWidth(100);
    }, 2000 + 3500 + 2500);

    const tFinish = window.setTimeout(() => {
      void (async () => {
        let data = finalDataRef.current;
        if (!data?.account_ready) {
          data = (await fetchStatusOnce()) ?? data;
        }
        if (!data?.account_ready) {
          await new Promise((r) => window.setTimeout(r, 3000));
          data = (await fetchStatusOnce()) ?? data;
        }
        if (data?.account_ready) {
          setOnboardMode("ready");
          setProcessingWaitHint(false);
        } else {
          setProcessingWaitHint(true);
        }
      })();
    }, 2000 + 3500 + 2500 + 400);

    return () => {
      window.clearTimeout(tProgress1);
      window.clearTimeout(tStage1);
      window.clearTimeout(tProgress2);
      window.clearTimeout(tStage2);
      window.clearTimeout(tProgress3);
      window.clearTimeout(tStage3);
      window.clearTimeout(tFinish);
    };
  }, [onboardMode, fetchStatusOnce]);

  const handleContinueFromConfirmation = useCallback(() => {
    setOnboardMode("processing");
  }, []);

  const handleCheckStatusAgain = useCallback(() => {
    setProcessingWaitHint(false);
    void (async () => {
      const data = await fetchStatusOnce();
      if (data?.account_ready) {
        setOnboardMode("ready");
      } else {
        setProcessingWaitHint(true);
      }
    })();
  }, [fetchStatusOnce]);

  /** Ready phase: display email from finalData only (never localStorage). */
  const readyEmailLine = (
    <p className={`${metaClass} font-medium text-neutral-700`}>{deliveryEmail ? deliveryEmail : "—"}</p>
  );

  const readyActions = (
    <>
      {readyEmailLine}
      {billId && (
        <p className={metaClass}>
          Payment reference — save your Bill ID if support asks:
          <br />
          <span className="font-mono text-neutral-600">{billId}</span>
        </p>
      )}
      {resendSuccess && (
        <p className="mt-4 rounded-lg bg-neutral-100 px-3 py-2 text-center text-base font-medium text-neutral-800">
          {resendSuccess}
        </p>
      )}
      {resendError && <p className="mt-3 text-center text-base text-red-700">{resendError}</p>}
      <button
        type="button"
        className={primaryBtnClass}
        disabled={sendDisabled}
        onClick={() => void handleSendSetPasswordEmail()}
      >
        {sendPasswordSetupPrimaryLabel(resendBusy, resendCooldown)}
      </button>
      <button type="button" className={secondaryBtnClass} onClick={() => openWebInbox(deliveryEmail)}>
        Open Email Inbox
      </button>
      {showWrongEmailFix && (
        <div className="mt-6 border-t border-neutral-200 pt-5 text-left">
          <p className="text-center text-base text-neutral-700">Not your email? Enter the correct one below.</p>
          <p className={`${bodyClass} mt-2`}>
            Used the wrong email? No problem. Enter the correct one and we&apos;ll send your access link there.
          </p>
          {recoveryMintError && <p className="mt-2 text-center text-base text-red-700">{recoveryMintError}</p>}
          <label className="mt-3 block text-sm font-medium text-neutral-600" htmlFor="payment-return-wrong-email">
            Correct email
          </label>
          <input
            id="payment-return-wrong-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base text-neutral-900 outline-none focus:border-neutral-500"
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
            className={`${primaryBtnClass} mt-3`}
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
            <p className={`${bodyClass} mt-3`}>Your access will be linked to this email.</p>
          )}
          {wrongSuccess && (
            <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-center text-base font-medium text-neutral-800">
              {wrongSuccess}
            </p>
          )}
          {wrongError && <p className="mt-2 text-center text-base text-red-700">{wrongError}</p>}
        </div>
      )}
    </>
  );

  /* --- No bill_id --- */
  if (!billId) {
    return (
      <main className={shellClass}>
        <div className={cardClass}>
          <h1 className={titleClass}>Payment</h1>
          <p className={bodyClass}>
            If you just paid, go back to the tab from checkout or check the email you used there.
          </p>
          <p className={bodyClass}>
            To set your password or send the link again, open{" "}
            <a
              href="/access"
              className="font-semibold text-neutral-900 underline"
              onClick={openAccessWithPersistedEmail}
            >
              account access
            </a>{" "}
            — your email may be filled in automatically — then tap Send Password Set Up Email Again.
          </p>
          <button type="button" className={primaryBtnClass} onClick={() => openWebInbox(null)}>
            Open Gmail
          </button>
          <p className={metaClass}>Or check your email app</p>
        </div>
      </main>
    );
  }

  /* --- Loading first status --- */
  if (loading) {
    return (
      <main className={shellClass}>
        <div className={cardClass}>
          <h1 className={titleClass}>One moment</h1>
          <p className={bodyClass}>We&apos;re loading your payment details.</p>
        </div>
      </main>
    );
  }

  /* --- Paid: guided 3-phase flow (Billplz success path) --- */
  if (paid) {
    if (onboardMode === "confirmation") {
      return (
        <main className={shellClass}>
          <div className={cardClass}>
            <h1 className={titleClass}>Payment successful</h1>
            <p className={bodyClass}>A receipt has been sent to your email.</p>
            {paidAt ? <p className={metaClass}>Paid at: {paidAt}</p> : null}
            <button type="button" className={primaryBtnClass} onClick={handleContinueFromConfirmation}>
              Continue to set up your account
            </button>
          </div>
        </main>
      );
    }

    if (onboardMode === "processing") {
      return (
        <main className={shellClass}>
          <div className={cardClass}>
            <h1 className={titleClass}>Setting up your access</h1>
            <p className={bodyClass}>Please keep this page open for a moment.</p>
            <ul className="mt-6 list-none space-y-4 text-left">
              <li className={stageIndex >= 1 ? "text-base text-neutral-800" : "text-base font-medium text-neutral-900"}>
                {stageIndex >= 1 ? "✓ Payment received" : "Payment received"}
              </li>
              <li
                className={
                  stageIndex >= 2
                    ? "text-base text-neutral-800"
                    : stageIndex === 1
                      ? "text-base font-medium text-neutral-900"
                      : "text-base text-neutral-500"
                }
              >
                {stageIndex >= 2
                  ? "✓ Securing your account and verifying your access"
                  : "🔒 Securing your account and verifying your access"}
              </li>
              <li
                className={
                  stageIndex >= 3
                    ? "text-base text-neutral-800"
                    : stageIndex === 2
                      ? "text-base font-medium text-neutral-900"
                      : "text-base text-neutral-500"
                }
              >
                {stageIndex >= 3 ? "✓ Finalising your setup" : "⏳ Finalising your setup"}
              </li>
            </ul>
            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-neutral-900 transition-[width] duration-1000 ease-out"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
            {processingWaitHint && (
              <>
                <p className={`${bodyClass} mt-6`}>
                  We&apos;re still confirming your payment with your bank. This can take a little longer.
                </p>
                <button type="button" className={primaryBtnClass} onClick={handleCheckStatusAgain}>
                  Check status
                </button>
              </>
            )}
          </div>
        </main>
      );
    }

    /* ready — only after processing phase completes (user-controlled gate). */
    if (onboardMode === "ready" && accountReady && deliveryEmail) {
      return (
        <main className={shellClass}>
          <div className={cardClass}>
            <h1 className={titleClass}>Your account is ready</h1>
            <p className={bodyClass}>We&apos;ll send your access link to:</p>
            {readyActions}
          </div>
        </main>
      );
    }

    if (onboardMode === "ready" && accountReady && !deliveryEmail) {
      return (
        <main className={shellClass}>
          <div className={cardClass}>
            <h1 className={titleClass}>Your account is ready</h1>
            <p className={bodyClass}>
              We couldn&apos;t load your email on this screen. Open{" "}
              <a href="/access" className="font-semibold underline" onClick={openAccessWithPersistedEmail}>
                account access
              </a>{" "}
              and use Send password link again with the address you used at checkout.
            </p>
          </div>
        </main>
      );
    }

    if (onboardMode === "ready" && !accountReady) {
      return (
        <main className={shellClass}>
          <div className={cardClass}>
            <h1 className={titleClass}>Almost there</h1>
            <p className={bodyClass}>
              Your payment was received, but we&apos;re still finishing account setup. Tap below to refresh status.
            </p>
            {billId ? <p className={metaClass}>Bill ID: {billId}</p> : null}
            <button type="button" className={primaryBtnClass} onClick={handleCheckStatusAgain}>
              Check status
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className={shellClass}>
        <div className={cardClass}>
          <h1 className={titleClass}>One moment</h1>
          <p className={bodyClass}>Please refresh this page and try again.</p>
          <button type="button" className={primaryBtnClass} onClick={() => window.location.reload()}>
            Refresh page
          </button>
        </div>
      </main>
    );
  }

  /* --- billId but not paid query param: pending / support --- */
  return (
    <main className={shellClass}>
      <div className={cardClass}>
        <h1 className={titleClass}>Payment pending</h1>
        <p className={bodyClass}>
          We couldn&apos;t confirm payment from this page yet. When your email appears below, use Send Password Setup
          Email to get a link — even if the first email never arrived.
        </p>
        {billId && (
          <p className={metaClass}>
            Bill ID: <span className="font-mono">{billId}</span>
          </p>
        )}
        {finalData?.next_step === "contact_support" && (
          <p className="mt-4 text-center text-base text-red-700">
            We couldn&apos;t match this payment yet. Contact support with the reference above.
          </p>
        )}
        {deliveryEmail ? (
          readyActions
        ) : (
          <p className={bodyClass}>
            This page will refresh with your email shortly. You can also open{" "}
            <a href="/access" className="font-semibold underline" onClick={openAccessWithPersistedEmail}>
              account access
            </a>{" "}
            and use Send Password Set Up Email Again.
          </p>
        )}
        {!deliveryEmail && (
          <button
            type="button"
            className={primaryBtnClass}
            onClick={() => void fetchStatusOnce()}
          >
            Check status
          </button>
        )}
      </div>
    </main>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <main className={shellClass}>
          <div className={cardClass}>
            <h1 className={titleClass}>One moment</h1>
            <p className={bodyClass}>Loading…</p>
          </div>
        </main>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
