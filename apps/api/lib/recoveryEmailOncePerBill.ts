import type { createServiceClient } from "@cb/supabase/service";

type Svc = ReturnType<typeof createServiceClient>;

/**
 * At most one recovery email per Billplz bill (`payments.billplz_bill_id`).
 * Atomically claims the row (recovery_email_sent false → true) before sending so
 * concurrent webhooks cannot double-send; rolls the flag back if send throws.
 * If no payment row exists yet, skips email (confirm-payment or a retry can run later).
 */
export async function withRecoveryEmailOncePerBill(
  svc: Svc,
  billId: string,
  sendRecoveryEmail: () => Promise<void>
): Promise<void> {
  const trimmed = billId.trim();
  if (!trimmed) {
    console.warn("[recovery-email] skip: empty billplz_bill_id");
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
    console.warn("[recovery-email] claim update failed", claimErr.message);
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
        "[recovery-email] no payment row for bill — skip email (insert may not be committed yet)",
        { billplz_bill_id: trimmed }
      );
    } else if (row.recovery_email_sent === true) {
      console.info("[recovery-email] skip: already sent for bill", { billplz_bill_id: trimmed });
    }
    return;
  }

  try {
    await sendRecoveryEmail();
  } catch (e) {
    await svc
      .schema("public")
      .from("payments")
      .update({ recovery_email_sent: false, updated_at: new Date().toISOString() })
      .eq("id", claimed.id);
    throw e;
  }
}
