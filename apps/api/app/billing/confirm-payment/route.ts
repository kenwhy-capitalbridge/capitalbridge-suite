import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { getBillplzBill } from "@/lib/billplz";
import { loadPlanMap } from "@cb/advisory-graph/plans/planMap";
import { activateMembershipFromPaidBillingSession } from "@/lib/activateMembershipFromBillingSession";

export const runtime = "nodejs";

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

/**
 * Fallback when Billplz callback never fires: user returns to payment-return with bill_id.
 * Idempotent: if session already paid and membership linked, returns ok.
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
    .select("id, email, plan_id, status, user_id, membership_id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionErr || !session) {
    return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
  }

  if (session.status === "paid" && session.membership_id) {
    return NextResponse.json({ ok: true, already_processed: true });
  }

  const bill = await getBillplzBill(billId);
  if (!bill || !bill.paid) {
    return NextResponse.json({ ok: false, paid: false });
  }

  const now = new Date().toISOString();
  const amountNum = bill.paid_amount ?? bill.amount ?? null;

  if (session.status !== "paid") {
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
  }

  const preUserId = session.user_id as string | null | undefined;
  if (!preUserId) {
    return NextResponse.json({ ok: false, error: "missing_user_id" }, { status: 400 });
  }

  const { data: authWrap, error: guErr } = await svc.auth.admin.getUserById(preUserId);
  if (guErr || !authWrap?.user?.id) {
    return NextResponse.json({ ok: false, error: "invalid_user" }, { status: 400 });
  }

  const userId = authWrap.user.id;
  const sessionEmail = typeof session.email === "string" ? session.email.trim() : "";
  const authEmail = (authWrap.user.email ?? "").trim();
  if (sessionEmail && authEmail && normalizeEmail(sessionEmail) !== normalizeEmail(authEmail)) {
    return NextResponse.json({ ok: false, error: "email_mismatch" }, { status: 409 });
  }
  const userEmail = sessionEmail || authEmail;
  if (!userEmail) {
    return NextResponse.json({ ok: false, error: "user_missing_email" }, { status: 400 });
  }

  const { data: planRow } = await svc
    .schema("public")
    .from("plans")
    .select("id, is_trial")
    .eq("id", session.plan_id)
    .maybeSingle();

  if (!planRow?.id) {
    return NextResponse.json({ ok: false, error: "plan_not_found" }, { status: 400 });
  }

  await svc
    .schema("public")
    .from("profiles")
    .upsert({ id: userId, email: userEmail }, { onConflict: "id" });

  const activate = await activateMembershipFromPaidBillingSession({
    svc,
    billingSessionId: session.id,
    userId,
  });

  if (!activate.ok || !activate.membershipId) {
    console.error("[confirm-payment] membership activation failed", {
      billId,
      error: activate.ok ? undefined : activate.error,
    });
    return NextResponse.json(
      { ok: false, error: "membership_activate_failed", detail: activate.ok ? undefined : activate.error },
      { status: 500 }
    );
  }

  try {
    const { data: uwrap } = await svc.auth.admin.getUserById(userId);
    const meta = { ...(uwrap?.user?.user_metadata ?? {}), checkout_pending: false };
    await svc.auth.admin.updateUserById(userId, { user_metadata: meta });
  } catch {
    /* noop */
  }

  return NextResponse.json({ ok: true, source: "confirm_payment" });
}
