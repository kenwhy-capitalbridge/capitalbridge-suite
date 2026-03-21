import type { createServiceClient } from "@cb/supabase/service";

type Svc = ReturnType<typeof createServiceClient>;

export function getAccessPageRedirectUrl(): string {
  const base =
    process.env.LOGIN_APP_URL ??
    process.env.NEXT_PUBLIC_LOGIN_APP_URL ??
    "https://login.thecapitalbridge.com";
  return `${base.replace(/\/$/, "")}/access`;
}

async function ensureAuthUserReadyForOnboardingEmail(
  svc: Svc,
  userId: string,
  userEmail: string
): Promise<void> {
  const { data: wrap, error: guErr } = await svc.auth.admin.getUserById(userId);
  if (!wrap?.user?.id) {
    throw new Error(guErr?.message ?? "auth_user_not_found");
  }

  if (!wrap.user.email_confirmed_at) {
    const { error: upErr } = await svc.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (upErr) {
      console.warn("[recover-email] email_confirm update failed", { userId, message: upErr.message });
    }
  }
}

async function sendRecoverEmail(svc: Svc, email: string, redirectTo: string): Promise<void> {
  const { error } = await svc.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (!error) return;

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
    body: JSON.stringify({ email: email.trim() }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`recover HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
}

/**
 * Server-side set-password email (same as post-payment onboarding).
 */
export async function sendPasswordSetupEmailToUser(
  svc: Svc,
  userId: string,
  userEmail: string
): Promise<void> {
  const email = userEmail.trim();
  if (!email) throw new Error("empty_email");

  await ensureAuthUserReadyForOnboardingEmail(svc, userId, email);
  const redirectTo = getAccessPageRedirectUrl();
  await sendRecoverEmail(svc, email, redirectTo);
}
