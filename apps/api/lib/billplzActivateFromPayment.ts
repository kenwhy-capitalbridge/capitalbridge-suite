/**
 * Billplz → Supabase: insert payment first (unique billplz_bill_id), then activate_membership_for_billplz RPC.
 * Duplicate webhook (23505): skip if membership already linked; otherwise run RPC to complete activation.
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
  /** Billplz amount field (typically sen/cents as integer string) */
  amountCents: number | null;
  paymentConfirmedAtIso: string;
  rawWebhook: Record<string, unknown>;
  billingSessionId?: string | null;
};

export type RpcActivateResult = {
  ok: boolean;
  duplicatePayment?: boolean;
  idempotentRpc?: boolean;
  error?: string;
  membershipId?: string | null;
  isTrial?: boolean;
};

export async function insertBillplzPaymentThenActivate(
  params: BillplzPaymentActivateParams
): Promise<RpcActivateResult> {
  const billId = params.billId?.trim();
  if (!billId) {
    console.error("[billplz-payment] rejected: billplz_bill_id is empty");
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
    console.info("[billplz-payment] duplicate Billplz payment (23505), idempotency branch", { billId });
    const { data: existing, error: selErr } = await params.svc
      .schema("public")
      .from("payments")
      .select("id, membership_id")
      .eq("billplz_bill_id", billId)
      .maybeSingle();
    if (selErr) {
      console.error("[billplz-payment] duplicate branch: could not load payment row", {
        billId,
        message: selErr.message,
      });
      return { ok: false, error: selErr.message };
    }
    if (existing?.membership_id) {
      console.info("[billplz-payment] duplicate webhook — membership already linked, skipping RPC", {
        billId,
        membership_id: existing.membership_id,
      });
      return {
        ok: true,
        duplicatePayment: true,
        idempotentRpc: true,
        membershipId: existing.membership_id,
      };
    }
    console.info("[billplz-payment] payment exists without membership — invoking activate_membership_for_billplz", {
      billId,
    });
  } else if (insertErr) {
    console.error("[billplz-payment] payments insert failed", {
      billId,
      code: insertErr.code,
      message: insertErr.message,
      details: insertErr.details,
      hint: insertErr.hint,
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
    console.error("[billplz-payment] activate_membership_for_billplz RPC error", {
      billId,
      message: rpcErr.message,
      code: rpcErr.code,
    });
    return { ok: false, error: rpcErr.message };
  }

  const row = rpcData as {
    ok?: boolean;
    error?: string;
    detail?: string;
    membership_id?: string;
    idempotent?: boolean;
    is_trial?: boolean;
  };

  if (!row?.ok) {
    console.error("[billplz-payment] activate_membership_for_billplz returned ok=false", {
      billId,
      error: row?.error,
      detail: row?.detail,
      rpcData: row,
    });
    return {
      ok: false,
      error: String(row?.error ?? "rpc_activate_failed"),
    };
  }

  if (row.idempotent) {
    console.info("[billplz-payment] RPC idempotent (membership already on payment)", {
      billId,
      membership_id: row.membership_id,
    });
  } else {
    console.info("[billplz-payment] membership activated and payment linked", {
      billId,
      membership_id: row.membership_id,
    });
  }

  return {
    ok: true,
    duplicatePayment: insertErr?.code === "23505",
    idempotentRpc: !!row.idempotent,
    membershipId: row.membership_id ?? null,
    isTrial: !!row.is_trial,
  };
}
