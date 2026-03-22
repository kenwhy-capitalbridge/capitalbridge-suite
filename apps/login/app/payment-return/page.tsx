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

/** Capital Bridge: gold primary, outlined secondary (globals.css) */
const primaryBtnClass =
  "cb-btn-primary w-full mt-6 text-center text-base font-semibold disabled:cursor-not-allowed";

const secondaryBtnClass = "cb-btn-secondary w-full mt-3 text-center text-base font-medium";

const shellClass = "cb-auth-main";
const cardClass = "cb-card w-full max-w-md";
const titleClass = "cb-card-title text-center text-xl";
const bodyClass = "mt-2 text-center text-base text-cb-green/85";
const metaClass = "mt-2 text-center text-sm text-cb-green/70";

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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

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
              ? "Could not complete that action from this page. Try again in a moment."
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
    <p className={`${metaClass} font-medium text-cb-green`}>{deliveryEmail ? deliveryEmail : "—"}</p>
  );

  const readyActions = (
    <>
      {readyEmailLine}
      {billId && (
        <p className={metaClass}>
          Payment reference — save your Bill ID if support asks:
          <br />
          <span className="font-mono text-cb-green/80">{billId}</span>
        </p>
      )}
      {resendSuccess && (
        <p className="cb-message-success mt-4 text-center text-base font-medium">{resendSuccess}</p>
      )}
      {resendError && <p className="cb-message-error mt-3 text-center text-base">{resendError}</p>}
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
              className="cb-link font-semibold underline"
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
              <li
                className={
                  stageIndex >= 1 ? "text-base text-cb-green/85" : "text-base font-medium text-cb-green"
                }
              >
                {stageIndex >= 1 ? "✓ Payment received" : "Payment received"}
              </li>
              <li
                className={
                  stageIndex >= 2
                    ? "text-base text-cb-green/85"
                    : stageIndex === 1
                      ? "text-base font-medium text-cb-green"
                      : "text-base text-cb-green/50"
                }
              >
                {stageIndex >= 2
                  ? "✓ Securing your account and verifying your access"
                  : "🔒 Securing your account and verifying your access"}
              </li>
              <li
                className={
                  stageIndex >= 3
                    ? "text-base text-cb-green/85"
                    : stageIndex === 2
                      ? "text-base font-medium text-cb-green"
                      : "text-base text-cb-green/50"
                }
              >
                {stageIndex >= 3 ? "✓ Finalising your setup" : "⏳ Finalising your setup"}
              </li>
            </ul>
            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-cb-green/15">
              <div
                className="h-full rounded-full bg-cb-gold transition-[width] duration-1000 ease-out"
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
            <p className={metaClass}>Your payment has been securely processed.</p>
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
              <a href="/access" className="cb-link font-semibold underline" onClick={openAccessWithPersistedEmail}>
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
          <p className={bodyClass}>
            Something unexpected happened. Use Refresh below or return from checkout if this keeps happening.
          </p>
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
          <p className="cb-message-error mt-4 text-center text-base">
            We couldn&apos;t match this payment yet. Contact support with the reference above.
          </p>
        )}
        {deliveryEmail ? (
          readyActions
        ) : (
          <p className={bodyClass}>
            This page will refresh with your email shortly. You can also open{" "}
            <a href="/access" className="cb-link font-semibold underline" onClick={openAccessWithPersistedEmail}>
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
