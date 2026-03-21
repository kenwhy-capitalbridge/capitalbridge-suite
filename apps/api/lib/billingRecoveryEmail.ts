import type { createServiceClient } from "@cb/supabase/service";

type Svc = ReturnType<typeof createServiceClient>;

/**
 * Login app `/access` — must match Supabase Auth → URL Configuration → Redirect URLs.
 * Production default matches payment-first onboarding.
 */
export function getAccessPageRedirectUrl(): string {
  const base =
    process.env.LOGIN_APP_URL ??
    process.env.NEXT_PUBLIC_LOGIN_APP_URL ??
    "https://login.thecapitalbridge.com";
  return `${base.replace(/\/$/, "")}/access`;
}

/**
 * Single onboarding email path: Supabase **Reset Password** template, invoked via
 * `resetPasswordForEmail` (same as Auth recover). No `signUp()`, no Confirm Sign Up,
 * no second transport — template copy should read as onboarding (see `SUPABASE_EMAIL_ONBOARDING.md`).
 */
export async function sendOnboardingEmailAfterPayment(
  svc: Svc,
  _userId: string,
  userEmail: string
): Promise<void> {
  const email = userEmail.trim();
  if (!email) {
    console.warn("[onboarding-email] skip: empty email");
    return;
  }

  const redirectTo = getAccessPageRedirectUrl();
  const { error } = await svc.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("[onboarding-email] resetPasswordForEmail failed", {
      email,
      message: error.message,
    });
    throw error;
  }

  console.info("[onboarding-email] sent", { email });
}

export const sendRecoveryEmailAfterPayment = sendOnboardingEmailAfterPayment;
