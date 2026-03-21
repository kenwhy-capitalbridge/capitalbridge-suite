import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { getBillplzBill } from "@/lib/billplz";
import { loadPlanMap } from "@cb/advisory-graph/plans/planMap";
import { insertBillplzPaymentThenActivate } from "@/lib/billplzActivateFromPayment";
import { sendRecoveryEmailAfterPayment } from "@/lib/billingRecoveryEmail";
import { withOnboardingEmailOncePerBill } from "@/lib/recoveryEmailOncePerBill";
import { resolveAuthUserForPayment } from "@/lib/paymentAuthUser";

export const runtime = "nodejs";

/**
 * Fallback when Billplz callback never fires: user returns to payment-return with bill_id.
 * We check Billplz API for payment status and, if paid, create user + membership + send set-password email.
 * Idempotent: if session already paid, returns ok without re-processing.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const billId = url.searchParams.get("bill_id")?.trim();
  if (!billId) {
    return NextResponse.json({ error: "missing_bill_id" }, { status: 400 });
  }

  const svc = createServiceClient();
  await loadPlanMap(svc);

  const { data: session, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, email, plan_id, status, user_id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionErr || !session) {
    return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
  }
  if (session.status === "paid") {
    return NextResponse.json({ ok: true, already_processed: true });
  }

  const bill = await getBillplzBill(billId);
  if (!bill || !bill.paid) {
    return NextResponse.json({ ok: false, paid: false });
  }

  const now = new Date().toISOString();
  const amountNum = bill.paid_amount ?? bill.amount ?? null;

  await svc
    .schema("public")
    .from("billing_sessions")
    .update({
      status: "paid",
      payment_confirmed_at: now,
      payment_provider: "billplz",
      payment_currency: "MYR",
      payment_amount: amountNum != null ? amountNum / 100 : null,
      updated_at: now,
    })
    .eq("id", session.id);

  const sessionEmail = session.email as string | null | undefined;
  const preUserId = session.user_id as string | null | undefined;
  if (!sessionEmail?.trim()) {
    return NextResponse.json({ ok: false, error: "missing_session_email" }, { status: 400 });
  }

  let userId: string;
  let userEmail: string;
  try {
    const resolved = await resolveAuthUserForPayment(svc, {
      billingSessionUserId: preUserId,
      sessionEmail,
    });
    userId = resolved.userId;
    userEmail = resolved.email;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "auth_user_resolve_failed", detail: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }

  if (userId !== preUserId) {
    await svc
      .schema("public")
      .from("billing_sessions")
      .update({ user_id: userId, updated_at: now })
      .eq("id", session.id);
  }

  const { data: planRow } = await svc
    .schema("public")
    .from("plans")
    .select("id, is_trial, slug")
    .eq("id", session.plan_id)
    .maybeSingle();

  if (!planRow?.slug) {
    return NextResponse.json({ ok: false, error: "plan_not_found" }, { status: 400 });
  }

  const { data: profileRow } = await svc.schema("public").from("profiles").select("trial_use_count").eq("id", userId).maybeSingle();
  const currentTrialCount = profileRow?.trial_use_count ?? 0;
  const newTrialCount = planRow.is_trial ? currentTrialCount + 1 : currentTrialCount;
  await svc
    .schema("public")
    .from("profiles")
    .upsert(
      { id: userId, email: userEmail, trial_use_count: newTrialCount },
      { onConflict: "id" }
    );

  const activate = await insertBillplzPaymentThenActivate({
    svc,
    billId,
    userId,
    planId: planRow.id,
    planSlug: planRow.slug,
    userEmail,
    amountCents: amountNum != null ? Math.round(amountNum) : null,
    paymentConfirmedAtIso: now,
    rawWebhook: {
      source: "confirm_payment",
      bill_id: billId,
      paid: true,
    },
    billingSessionId: session.id,
  });

  if (!activate.ok || !activate.membershipId) {
    console.error("[confirm-payment] payment insert / activate failed", {
      billId,
      error: activate.error,
    });
    return NextResponse.json(
      { ok: false, error: "payment_or_activate_failed", detail: activate.error },
      { status: 500 }
    );
  }

  await svc
    .schema("public")
    .from("billing_sessions")
    .update({ user_id: userId, membership_id: activate.membershipId, updated_at: now })
    .eq("id", session.id);

  if (planRow.is_trial) {
    void svc.rpc("increment_trial_use_count" as never, { user_id: userId }).then(() => {}, () => {});
  }

  try {
    const { data: uwrap } = await svc.auth.admin.getUserById(userId);
    const meta = { ...(uwrap?.user?.user_metadata ?? {}), checkout_pending: false };
    await svc.auth.admin.updateUserById(userId, { user_metadata: meta });
  } catch {
    /* noop */
  }

  await svc
    .schema("public")
    .from("profiles")
    .upsert(
      { id: userId, email: userEmail, payment_status: "active", pending_plan: null },
      { onConflict: "id" }
    );

  await withOnboardingEmailOncePerBill(svc, billId, () =>
    sendRecoveryEmailAfterPayment(svc, userId, userEmail)
  ).catch((e) => console.error("[confirm-payment] onboarding email failed", e));

  return NextResponse.json({ ok: true, source: "confirm_payment" });
}
