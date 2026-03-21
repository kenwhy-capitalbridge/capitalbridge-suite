import type { createServiceClient } from "@cb/supabase/service";

type Svc = ReturnType<typeof createServiceClient>;

/**
 * Idempotent onboarding email per Billplz bill (`payments.recovery_email_sent`).
 * Atomic claim (false → true) before send prevents duplicate emails on concurrent webhooks;
 * rolls back flag if `resetPasswordForEmail` throws.
 */
export async function withOnboardingEmailOncePerBill(
  svc: Svc,
  billId: string,
  sendOnboardingEmail: () => Promise<void>
): Promise<void> {
  const trimmed = billId.trim();
  if (!trimmed) {
    console.warn("[onboarding-email] skip: empty billplz_bill_id");
    return;
  }

  const now = new Date().toISOString();
  const { data: claimed, error: claimErr } = await svc
    .schema("public")
    .from("payments")
    .update({ recovery_email_sent: true, updated_at: now })
    .eq("billplz_bill_id", trimmed)
    .eq("recovery_email_sent", false)
    .select("id")
    .maybeSingle();

  if (claimErr) {
    console.warn("[onboarding-email] claim update failed", claimErr.message);
    return;
  }

  if (!claimed?.id) {
    const { data: row } = await svc
      .schema("public")
      .from("payments")
      .select("id, recovery_email_sent")
      .eq("billplz_bill_id", trimmed)
      .maybeSingle();

    if (!row) {
      console.warn(
        "[onboarding-email] no payment row for bill — skip email (insert may not be committed yet)",
        { billplz_bill_id: trimmed }
      );
    } else if (row.recovery_email_sent === true) {
      console.info("[onboarding-email] skip: already sent for bill", { billplz_bill_id: trimmed });
    }
    return;
  }

  try {
    await sendOnboardingEmail();
  } catch (e) {
    await svc
      .schema("public")
      .from("payments")
      .update({ recovery_email_sent: false, updated_at: new Date().toISOString() })
      .eq("id", claimed.id);
    throw e;
  }
}

/** @deprecated use withOnboardingEmailOncePerBill */
export const withRecoveryEmailOncePerBill = withOnboardingEmailOncePerBill;
