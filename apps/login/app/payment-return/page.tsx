"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getAccessRedirectUrlForAuthEmails } from "@/lib/authEmailRedirect";
import { isSupabaseConfigured, recoverySupabase } from "@/lib/supabaseClient";
import {
  ACCESS_EMAIL_COOLDOWN_SEC,
  ACCESS_EMAIL_SENT_MESSAGE,
  ACCESS_EMAIL_SENDING_LABEL,
  accessEmailResendButtonLabel,
} from "@/lib/resendAccessEmail";
import { persistCheckoutEmail, buildAccessUrl, readPersistedCheckoutEmail } from "@/lib/checkoutEmailPersistence";
import { NotYourEmailChangeLink, PaymentTargetEmailLine } from "@/components/PaymentTargetEmailCopy";

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

function setPasswordPrimaryLabel(busy: boolean, cooldownSec: number): string {
  if (busy) return ACCESS_EMAIL_SENDING_LABEL;
  if (cooldownSec > 0) return `Resend in ${cooldownSec}s`;
  return "Set your password";
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

  const redirectTo = useMemo(() => getAccessRedirectUrlForAuthEmails(), []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

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

  useEffect(() => {
    if (statusEmail) persistCheckoutEmail(statusEmail);
  }, [statusEmail]);

  const sendDisabled =
    resendBusy || resendCooldown > 0 || !statusEmail || !isSupabaseConfigured;

  const handleSendSetPasswordEmail = useCallback(async () => {
    setResendError(null);
    const em = statusEmail;
    if (!em) {
      setResendError("We don't have your email on this screen. Use the same inbox you entered at checkout.");
      return;
    }
    if (!isSupabaseConfigured) {
      setResendError("Sign-in isn’t configured in this environment.");
      return;
    }
    if (resendCooldown > 0 || resendBusy) return;

    setResendBusy(true);
    const { error } = await recoverySupabase.auth.resetPasswordForEmail(em, {
      redirectTo,
    });
    setResendBusy(false);
    if (error) {
      setResendSuccess(null);
      setResendError(error.message);
      return;
    }
    persistCheckoutEmail(em);
    setResendSuccess(ACCESS_EMAIL_SENT_MESSAGE);
    setResendCooldown(ACCESS_EMAIL_COOLDOWN_SEC);
  }, [redirectTo, statusEmail, resendCooldown, resendBusy]);

  const accessHrefWithEmail = statusEmail ? buildAccessUrl({ email: statusEmail }) : "/access";

  const passwordEmailVariant: "pending" | "sent" =
    accountReady || !!resendSuccess ? "sent" : "pending";

  const emailActions = (
    <>
      {statusEmail && (
        <>
          <PaymentTargetEmailLine
            email={statusEmail}
            variant={passwordEmailVariant}
            className="mt-3 text-center"
          />
          <NotYourEmailChangeLink />
        </>
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
          {setPasswordPrimaryLabel(resendBusy, resendCooldown)}
        </button>
        <p className="text-sm leading-relaxed text-cb-green/85">
          Didn&apos;t get the email? Use Send password link again after the timer — you won&apos;t be left without a next step.
        </p>
        <button
          type="button"
          className={btnSecondary}
          disabled={sendDisabled}
          onClick={() => void handleSendSetPasswordEmail()}
        >
          {accessEmailResendButtonLabel(resendCooldown, resendBusy)}
        </button>
        <button type="button" className={btnSecondary} onClick={() => openWebInbox(statusEmail)}>
          Open email inbox
        </button>
        <p className="text-sm text-cb-green/75">Or open your email app and look for our message</p>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-cb-green/65">Check your spam folder if you don&apos;t see it</p>
    </>
  );

  if (!billId) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
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
            — your email may be filled in automatically — then tap Send password link again.
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
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
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
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
        <div className="cb-card max-w-md text-center">
          <h1 className="cb-card-title">Your account is ready.</h1>
          <p className="cb-card-subtitle mt-3 text-base leading-relaxed">
            We&apos;ve emailed you a link to set your password. Open it on this device to finish.
          </p>
          {statusEmail ? (
            emailActions
          ) : (
            <p className="mt-4 text-sm text-cb-green/85">
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
          {statusEmail && (
            <p className="mt-6 text-sm text-cb-green/80">
              <a href={accessHrefWithEmail} className="font-semibold underline">
                Open account access
              </a>{" "}
              (your email is pre-filled when possible)
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
      <div className="cb-card max-w-md text-center">
        <h1 className="cb-card-title">Payment pending</h1>
        <p className="cb-card-subtitle mt-2">
          We couldn&apos;t confirm payment from this page yet. When your email appears below, use Set your password to get a
          link — even if the first email never arrived.
        </p>
        {billId && <p className="mt-4 text-xs text-cb-green/55">Reference: {billId}</p>}
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
            and use Send password link again.
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
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.25rem" }}>
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
