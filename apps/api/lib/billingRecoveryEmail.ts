import type { createServiceClient } from "@cb/supabase/service";

type Svc = ReturnType<typeof createServiceClient>;

/**
 * Login app `/access` — must match Supabase Auth → URL Configuration → Redirect URLs.
 */
export function getAccessPageRedirectUrl(): string {
  const base =
    process.env.LOGIN_APP_URL ??
    process.env.NEXT_PUBLIC_LOGIN_APP_URL ??
    "https://login.thecapitalbridge.com";
  return `${base.replace(/\/$/, "")}/access`;
}

/**
 * Payment-first: never rely on "Confirm Sign Up". User is created before payment;
 * we ensure the account is treated as confirmed so GoTrue will send the recover email.
 */
async function ensureAuthUserReadyForOnboardingEmail(
  svc: Svc,
  userId: string,
  userEmail: string
): Promise<void> {
  const { data: wrap, error: guErr } = await svc.auth.admin.getUserById(userId);
  if (!wrap?.user?.id) {
    console.error("[onboarding-email] auth user missing", {
      userId,
      email: userEmail,
      message: guErr?.message,
    });
    throw new Error(guErr?.message ?? "auth_user_not_found");
  }

  if (!wrap.user.email_confirmed_at) {
    const { error: upErr } = await svc.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (upErr) {
      console.warn("[onboarding-email] email_confirm update failed", {
        userId,
        message: upErr.message,
      });
    }
  }
}

/**
 * Same behaviour as client `supabase.auth.resetPasswordForEmail` (recover → "Reset Password" template).
 * Configure that template in Dashboard as onboarding copy (see docs).
 */
async function sendRecoverEmail(svc: Svc, email: string, redirectTo: string): Promise<void> {
  const { error } = await svc.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (!error) return;

  console.warn("[onboarding-email] resetPasswordForEmail failed, using recover HTTP", {
    message: error.message,
  });

  await sendRecoverViaHttp(email.trim(), redirectTo);
}

async function sendRecoverViaHttp(email: string, redirectTo: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const recoverUrl = new URL(`${url}/auth/v1/recover`);
  recoverUrl.searchParams.set("redirect_to", redirectTo);

  const res = await fetch(recoverUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ email }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`recover HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
}

/**
 * Primary onboarding email after payment: recover flow → `/access` (set password).
 * Call only from user-triggered flows (e.g. manual “send setup email” after payment).
 * Does not use signUp() or "Confirm Sign Up".
 */
export async function sendOnboardingEmailAfterPayment(
  svc: Svc,
  userId: string,
  userEmail: string
): Promise<void> {
  const email = userEmail.trim();
  if (!email) {
    console.warn("[onboarding-email] skip: empty email", { userId });
    return;
  }

  await ensureAuthUserReadyForOnboardingEmail(svc, userId, email);

  const redirectTo = getAccessPageRedirectUrl();
  await sendRecoverEmail(svc, email, redirectTo);

  console.info("[onboarding-email] sent", { email });
}

/** Alias — same implementation; payment-first onboarding, not “forgot password” semantically. */
export const sendRecoveryEmailAfterPayment = sendOnboardingEmailAfterPayment;
