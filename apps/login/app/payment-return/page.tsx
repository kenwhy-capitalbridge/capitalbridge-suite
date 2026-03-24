"use client";

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  ACCESS_EMAIL_COOLDOWN_SEC,
  ACCESS_EMAIL_SENDING_LABEL,
  accessEmailResendCooldownLabel,
} from "@/lib/resendAccessEmail";
import {
  buildAccessUrl,
  persistBillplzBillId,
  persistCheckoutEmail,
  readPersistedCheckoutEmail,
} from "@/lib/checkoutEmailPersistence";
import { CalmAuthMessage } from "@/components/CalmAuthMessage";
import {
  COPY_EMAIL_NOT_RECEIVED_FALLBACK,
  COPY_EMAIL_TIMING_HINT,
  COPY_GLOBAL_ERROR,
  COPY_PAYMENT_PREPARING,
  COPY_PAYMENT_RECOVERY_NUDGE,
  COPY_RETRY_NOW,
  COPY_STILL_CHECKING,
} from "@/lib/uiCopyConstants";
import {
  PAYMENT_ERROR_ACTION,
  PAYMENT_ERROR_EMAIL,
  PAYMENT_ERROR_NOT_CONFIGURED,
  PAYMENT_ERROR_NOT_FOUND,
  PAYMENT_ERROR_RATE_LIMIT,
  PAYMENT_ERROR_SESSION,
  PAYMENT_HELP_LINE,
} from "@/lib/paymentFlowMessages";

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
  "cb-btn-primary w-full mt-4 text-center font-semibold disabled:cursor-not-allowed sm:mt-6";

/** Stronger emphasis for “Send Me My Access Link” only (ready phase). */
const sendAccessLinkPrimaryBtnClass =
  "cb-btn-primary w-full mt-4 py-3.5 text-center text-base font-semibold shadow-sm ring-1 ring-black/10 disabled:cursor-not-allowed sm:mt-6 sm:py-4";

const shellClass = "cb-auth-main";
const cardClass = "cb-card w-full max-w-md";
const titleClass = "cb-card-title text-center";
const bodyClass = "mt-2 text-center text-sm text-cb-green/85 sm:text-base";
const metaClass = "mt-2 text-center text-sm text-cb-green/70";

function formatDisplayEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

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

function sendMeMyAccessLinkLabel(busy: boolean, cooldownSec: number): string {
  if (busy) return ACCESS_EMAIL_SENDING_LABEL;
  if (cooldownSec > 0) return accessEmailResendCooldownLabel(cooldownSec);
  return "Send Me My Access Link";
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
  const [resendCooldownEndsAt, setResendCooldownEndsAt] = useState<number | null>(null);
  const [cooldownTick, setCooldownTick] = useState(0);
  const [accessLinkAck, setAccessLinkAck] = useState(false);
  const [showEmailFallbackLine, setShowEmailFallbackLine] = useState(false);
  const [initialLoadSlow, setInitialLoadSlow] = useState(false);
  const [statusActionSlow, setStatusActionSlow] = useState(false);

  const resendCooldownSec = useMemo(() => {
    if (!resendCooldownEndsAt) return 0;
    return Math.max(0, Math.ceil((resendCooldownEndsAt - Date.now()) / 1000));
  }, [resendCooldownEndsAt, cooldownTick]);

  useEffect(() => {
    if (!resendCooldownEndsAt) return;
    const id = window.setInterval(() => {
      setCooldownTick((t) => t + 1);
      if (Date.now() >= resendCooldownEndsAt) setResendCooldownEndsAt(null);
    }, 500);
    return () => clearInterval(id);
  }, [resendCooldownEndsAt]);

  useEffect(() => {
    const sync = () => setCooldownTick((t) => t + 1);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (!accessLinkAck) {
      setShowEmailFallbackLine(false);
      return;
    }
    setShowEmailFallbackLine(false);
    const t = window.setTimeout(() => setShowEmailFallbackLine(true), 12500);
    return () => clearTimeout(t);
  }, [accessLinkAck]);

  useEffect(() => {
    if (!loading) {
      setInitialLoadSlow(false);
      return;
    }
    const t = window.setTimeout(() => setInitialLoadSlow(true), 1000);
    return () => {
      clearTimeout(t);
      setInitialLoadSlow(false);
    };
  }, [loading]);

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
    resendCooldownSec > 0 ||
    !isSupabaseConfigured ||
    !accountReady ||
    !billId;

  const sendButtonIdleEnabled =
    !resendBusy &&
    resendCooldownSec <= 0 &&
    isSupabaseConfigured &&
    accountReady &&
    !!billId;

  const handleSendSetPasswordEmail = useCallback(async () => {
    if (resendBusy) return;
    setResendBusy(true);
    setResendError(null);
    try {
      if (!isSupabaseConfigured) {
        setResendError(PAYMENT_ERROR_NOT_CONFIGURED);
        return;
      }
      if (resendCooldownEndsAt != null && Date.now() < resendCooldownEndsAt) return;
      if (!billId) {
        setResendError(PAYMENT_ERROR_SESSION);
        return;
      }

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
        setResendError(
          data.error === "rate_limited"
            ? PAYMENT_ERROR_RATE_LIMIT
            : data.error === "forbidden_origin"
              ? PAYMENT_ERROR_ACTION
              : data.message ?? data.error ?? PAYMENT_ERROR_EMAIL
        );
        return;
      }
      const delivered = data.delivery_email?.trim() ?? "";
      if (!delivered) {
        setResendError(PAYMENT_ERROR_SESSION);
        return;
      }
      persistCheckoutEmail(delivered);
      setResendError(null);
      setAccessLinkAck(true);
      setResendCooldownEndsAt(Date.now() + ACCESS_EMAIL_COOLDOWN_SEC * 1000);
      void fetch("/api/auth/smart-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "success", kind: "login", email: delivered }),
      }).catch(() => {});
      void fetch("/api/auth/smart-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "success", kind: "email_mismatch", email: delivered }),
      }).catch(() => {});
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
  }, [resendCooldownEndsAt, resendBusy, billId]);

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
    setStatusActionSlow(false);
    const slowT = window.setTimeout(() => setStatusActionSlow(true), 1000);
    void (async () => {
      try {
        const data = await fetchStatusOnce();
        if (data?.account_ready) {
          setOnboardMode("ready");
        } else {
          setProcessingWaitHint(true);
        }
      } finally {
        window.clearTimeout(slowT);
        setStatusActionSlow(false);
      }
    })();
  }, [fetchStatusOnce]);

  const runFetchStatusWithSlow = useCallback(() => {
    setStatusActionSlow(false);
    const slowT = window.setTimeout(() => setStatusActionSlow(true), 1000);
    void fetchStatusOnce().finally(() => {
      window.clearTimeout(slowT);
      setStatusActionSlow(false);
    });
  }, [fetchStatusOnce]);

  /** Ready phase: display email from finalData only (never localStorage). */
  const readyActions = (
    <>
      <p className={`${bodyClass} font-medium`}>
        Access will be sent to: {deliveryEmail ? deliveryEmail : "—"}
      </p>
      <p className={bodyClass}>Click below to get your access link</p>
      {accessLinkAck ? (
        <div className={`${bodyClass} space-y-1`}>
          <p>Email sent. Check your inbox.</p>
          <p>{COPY_EMAIL_TIMING_HINT}</p>
        </div>
      ) : null}
      {resendError && (
        <p className="cb-message-error mt-3 text-center text-sm sm:text-base">{resendError}</p>
      )}
      <button
        type="button"
        className={sendAccessLinkPrimaryBtnClass}
        disabled={sendDisabled}
        onClick={() => void handleSendSetPasswordEmail()}
      >
        {sendMeMyAccessLinkLabel(resendBusy, resendCooldownSec)}
      </button>
      <p className="mt-2 text-center text-xs leading-relaxed text-cb-green/60 sm:text-sm">{COPY_PAYMENT_RECOVERY_NUDGE}</p>
    </>
  );

  /* --- No bill_id --- */
  if (!billId) {
    return (
      <main className={shellClass}>
        <div className={cardClass}>
          <h1 className={titleClass}>Payment</h1>
          <p className={bodyClass}>Your payment is being processed.</p>
          <p className={bodyClass}>
            If you&apos;ve just completed checkout, you can return to your email — we&apos;ll send you a secure link to set
            your password once everything is ready.
          </p>
          <p className={bodyClass}>
            If you don&apos;t see the email shortly, you can resend it via{" "}
            <a
              href="/access"
              className="cb-link font-bold underline decoration-cb-gold-dark/60 underline-offset-[3px] hover:text-cb-green"
              onClick={openAccessWithPersistedEmail}
            >
              Account Access
            </a>
            . Your email may already be filled in.
          </p>
          <button type="button" className={primaryBtnClass} onClick={() => openWebInbox(null)}>
            Open Inbox
          </button>
          <p className={metaClass}>Or use your email app</p>
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
          {initialLoadSlow ? (
            <div className={`${bodyClass} mt-3 flex justify-center`} role="status" aria-busy="true">
              <span
                className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-cb-green/25 border-t-cb-green"
                aria-hidden
              />
            </div>
          ) : null}
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
            <h1 className={titleClass}>Payment Received</h1>
            <p className={bodyClass}>
              Access will be sent to: {deliveryEmail ? formatDisplayEmail(deliveryEmail) : "—"}
            </p>
            {!deliveryEmail ? <p className={bodyClass}>{COPY_PAYMENT_PREPARING}</p> : null}
            {paidAt ? <p className={metaClass}>Paid at: {paidAt}</p> : null}
            <button type="button" className={primaryBtnClass} onClick={handleContinueFromConfirmation}>
              Continue
            </button>
          </div>
        </main>
      );
    }

    if (onboardMode === "processing") {
      return (
        <main className={shellClass}>
          <div className={cardClass}>
            <h1 className={titleClass}>Payment Received</h1>
            <p className={bodyClass}>{COPY_PAYMENT_PREPARING}</p>
            {statusActionSlow ? (
              <div className={`${bodyClass} mt-3 flex justify-center`} role="status" aria-busy="true">
                <span
                  className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-cb-green/25 border-t-cb-green"
                  aria-hidden
                />
              </div>
            ) : null}
            {processingWaitHint ? (
              <>
                <p className={`${bodyClass} mt-4 sm:mt-6`}>{COPY_STILL_CHECKING}</p>
                <button type="button" className={primaryBtnClass} onClick={handleCheckStatusAgain}>
                  {COPY_RETRY_NOW}
                </button>
              </>
            ) : null}
          </div>
        </main>
      );
    }

    /* ready — only after processing phase completes (user-controlled gate). */
    if (onboardMode === "ready" && accountReady && deliveryEmail) {
      return (
        <main className={shellClass}>
          <div className={cardClass}>
            <h1 className={titleClass}>Payment Received</h1>
            {readyActions}
          </div>
        </main>
      );
    }

    if (onboardMode === "ready" && accountReady && !deliveryEmail) {
      return (
        <main className={shellClass}>
          <div className={cardClass}>
            <h1 className={titleClass}>Your Account is Ready</h1>
            <p className={bodyClass}>
              We couldn&apos;t load your email on this screen. Open{" "}
              <a href="/access" className="cb-link font-semibold underline" onClick={openAccessWithPersistedEmail}>
                account access
              </a>{" "}
              and use Send password link again with the address you used at checkout.
            </p>
            <div className="mt-4 border-t border-cb-gold/30 pt-3 sm:mt-5 sm:pt-4">
              <CalmAuthMessage
                text={PAYMENT_HELP_LINE}
                className="text-center text-sm leading-relaxed text-cb-green/55"
              />
            </div>
          </div>
        </main>
      );
    }

    if (onboardMode === "ready" && !accountReady) {
      return (
        <main className={shellClass}>
          <div className={cardClass}>
            <h1 className={titleClass}>Payment Received</h1>
            <p className={bodyClass}>{COPY_PAYMENT_PREPARING}</p>
            {billId ? <p className={metaClass}>Bill ID: {billId}</p> : null}
            <button type="button" className={primaryBtnClass} onClick={handleCheckStatusAgain}>
              {COPY_RETRY_NOW}
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className={shellClass}>
        <div className={cardClass}>
          <h1 className={titleClass}>{COPY_GLOBAL_ERROR}</h1>
          <button type="button" className={primaryBtnClass} onClick={() => window.location.reload()}>
            Try Again
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
          We&apos;re confirming your payment. Once your email appears, send a new link.
        </p>
        {billId && (
          <p className={metaClass}>
            Bill ID: <span className="font-mono">{billId}</span>
          </p>
        )}
        {finalData?.next_step === "contact_support" && (
          <p className="cb-message-error mt-4 text-center text-sm sm:text-base">{PAYMENT_ERROR_NOT_FOUND}</p>
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
          <>
            {statusActionSlow ? (
              <div className={`${bodyClass} mt-3 flex justify-center`} role="status" aria-busy="true">
                <span
                  className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-cb-green/25 border-t-cb-green"
                  aria-hidden
                />
              </div>
            ) : null}
            <button type="button" className={primaryBtnClass} onClick={() => void runFetchStatusWithSlow()}>
              Check status
            </button>
          </>
        )}
        {!deliveryEmail && (
          <div className="mt-4 border-t border-cb-gold/30 pt-3 sm:mt-5 sm:pt-4">
            <CalmAuthMessage
              text={PAYMENT_HELP_LINE}
              className="text-center text-sm leading-relaxed text-cb-green/55"
            />
          </div>
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
