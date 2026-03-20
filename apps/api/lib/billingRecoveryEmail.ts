import type { createServiceClient } from "@cb/supabase/service";

type Svc = ReturnType<typeof createServiceClient>;

export function getAccessPageRedirectUrl(): string {
  const base =
    process.env.LOGIN_APP_URL ??
    process.env.NEXT_PUBLIC_LOGIN_APP_URL ??
    "https://login.thecapitalbridge.com";
  return `${base.replace(/\/$/, "")}/access`;
}

async function sendSetPasswordEmail(email: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = serviceKey ?? anonKey;
  if (!url || !apiKey) {
    console.warn(
      "[billing-recovery-email] skip: missing NEXT_PUBLIC_SUPABASE_URL or keys"
    );
    return;
  }
  const redirectTo = getAccessPageRedirectUrl();
  const recoverUrl = new URL(`${url}/auth/v1/recover`);
  recoverUrl.searchParams.set("redirect_to", redirectTo);
  try {
    const res = await fetch(recoverUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        ...(serviceKey ? { Authorization: `Bearer ${serviceKey}` } : {}),
      },
      body: JSON.stringify({ email: email.trim() }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn("[billing-recovery-email] recover request failed", {
        status: res.status,
        email,
        detail: text.slice(0, 300),
      });
      return;
    }
    console.info("[billing-recovery-email] recover triggered", { email });
  } catch (err) {
    console.warn("[billing-recovery-email] recover error", err);
  }
}

export async function sendRecoveryEmailAfterPayment(
  svc: Svc,
  userId: string,
  userEmail: string
): Promise<void> {
  const email = userEmail.trim();
  if (!email) {
    console.warn("[billing-recovery-email] skip: empty email", { userId });
    return;
  }

  const redirectTo = getAccessPageRedirectUrl();
  const { error: genErr } = await svc.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (genErr) {
    console.warn("[billing-recovery-email] generateLink(recovery) failed, using recover", {
      userId,
      message: genErr.message,
    });
    await sendSetPasswordEmail(email);
    return;
  }

  console.log("Recovery email triggered for:", email);
  await sendSetPasswordEmail(email);
}
