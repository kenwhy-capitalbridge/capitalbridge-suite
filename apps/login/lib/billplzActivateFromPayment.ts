/**
 * Same as API: payment row first (unique billplz_bill_id), then activate_membership_for_billplz.
 */

import type { createServiceClient } from "@cb/supabase/service";

type Svc = ReturnType<typeof createServiceClient>;

export type BillplzPaymentActivateParams = {
  svc: Svc;
  billId: string;
  userId: string;
  planId: string;
  planSlug: string;
  userEmail: string;
  amountCents: number | null;
  paymentConfirmedAtIso: string;
  rawWebhook: Record<string, unknown>;
  billingSessionId?: string | null;
};

export async function insertBillplzPaymentThenActivate(
  params: BillplzPaymentActivateParams
): Promise<{
  ok: boolean;
  duplicatePayment?: boolean;
  error?: string;
  membershipId?: string | null;
}> {
  const billId = params.billId?.trim();
  if (!billId) {
    console.error("[billplz-payment] missing billplz_bill_id");
    return { ok: false, error: "missing_bill_id" };
  }

  const paymentAmount =
    params.amountCents != null ? params.amountCents / 100 : null;

  const { error: insertErr } = await params.svc.schema("public").from("payments").insert({
    user_id: params.userId,
    plan_id: params.planId,
    billplz_bill_id: billId,
    membership_id: null,
    payment_provider: "billplz",
    payment_amount: paymentAmount,
    status: "paid",
    payment_confirmed_at: params.paymentConfirmedAtIso,
    paid_at: params.paymentConfirmedAtIso,
    amount_cents: params.amountCents,
    payment_currency: "MYR",
    billplz_collection_id: process.env.BILLPLZ_COLLECTION_ID ?? null,
    raw_webhook: params.rawWebhook,
  });

  if (insertErr?.code === "23505") {
    console.info("[billplz-payment] duplicate Billplz payment (23505)", { billId });
    const { data: existing, error: selErr } = await params.svc
      .schema("public")
      .from("payments")
      .select("id, membership_id")
      .eq("billplz_bill_id", billId)
      .maybeSingle();
    if (selErr) {
      console.error("[billplz-payment] load payment after 23505 failed", { billId, message: selErr.message });
      return { ok: false, error: selErr.message };
    }
    if (existing?.membership_id) {
      console.info("[billplz-payment] duplicate webhook, skipping activate", { billId });
      return { ok: true, duplicatePayment: true, membershipId: existing.membership_id };
    }
  } else if (insertErr) {
    console.error("[billplz-payment] insert failed", {
      billId,
      code: insertErr.code,
      message: insertErr.message,
    });
    return { ok: false, error: insertErr.message };
  }

  const email = params.userEmail.trim();
  const slug = params.planSlug.trim();
  const rpcPayload =
    params.billingSessionId != null && params.billingSessionId !== ""
      ? {
          p_billplz_bill_id: billId,
          p_user_email: email,
          p_plan_slug: slug,
          p_billing_session_id: params.billingSessionId,
        }
      : {
          p_billplz_bill_id: billId,
          p_user_email: email,
          p_plan_slug: slug,
        };

  const { data: rpcData, error: rpcErr } = await params.svc.rpc(
    "activate_membership_for_billplz",
    rpcPayload as never
  );

  if (rpcErr) {
    console.error("[billplz-payment] RPC error", { billId, message: rpcErr.message });
    return { ok: false, error: rpcErr.message };
  }

  const row = rpcData as { ok?: boolean; error?: string; membership_id?: string; idempotent?: boolean };
  if (!row?.ok) {
    console.error("[billplz-payment] RPC ok=false", { billId, rpcData: row });
    return { ok: false, error: String(row?.error ?? "rpc_failed") };
  }

  return {
    ok: true,
    duplicatePayment: insertErr?.code === "23505",
    membershipId: row.membership_id ?? null,
  };
}
