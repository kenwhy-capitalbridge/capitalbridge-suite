import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { getBillplzBill } from "@/lib/billplz";
import { loadPlanMap } from "@cb/advisory-graph/plans/planMap";
import { insertBillplzPaymentThenActivate } from "@/lib/billplzActivateFromPayment";
import { randomBytes } from "crypto";

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
    .select("id, email, plan_id, status")
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

  const sessionEmail = session.email?.trim();
  if (!sessionEmail) {
    return NextResponse.json({ ok: false, error: "session_missing_email" }, { status: 500 });
  }

  let userId: string;
  const tempPassword = randomBytes(24).toString("base64url");
  const { data: authUser, error: createUserErr } = await svc.auth.admin.createUser({
    email: sessionEmail,
    password: tempPassword,
    email_confirm: true,
  });

  if (createUserErr || !authUser?.user?.id) {
    const msg = String(createUserErr?.message ?? "").toLowerCase();
    const isAlreadyExists = msg.includes("already") || msg.includes("registered") || msg.includes("exists");
    if (isAlreadyExists) {
      const { data: listData } = await svc.auth.admin.listUsers({ perPage: 1000, page: 1 });
      const existing = listData?.users?.find((u) => (u.email ?? "").toLowerCase() === sessionEmail.toLowerCase());
      if (existing?.id) {
        userId = existing.id;
      } else {
        return NextResponse.json({ ok: false, error: "user_creation_failed" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ ok: false, error: "user_creation_failed" }, { status: 500 });
    }
  } else {
    userId = authUser.user.id;
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
      { id: userId, email: sessionEmail, trial_use_count: newTrialCount },
      { onConflict: "id" }
    );

  const activate = await insertBillplzPaymentThenActivate({
    svc,
    billId,
    userId,
    planId: planRow.id,
    planSlug: planRow.slug,
    userEmail: sessionEmail,
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

  // Trigger set-password email (same as webhook)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = serviceKey ?? anonKey;
  if (supabaseUrl && apiKey) {
    const loginBase =
      process.env.LOGIN_APP_URL ??
      process.env.NEXT_PUBLIC_LOGIN_APP_URL ??
      "https://login.thecapitalbridge.com";
    const redirectTo = `${loginBase.replace(/\/$/, "")}/reset-password`;
    const recoverUrl = new URL(`${supabaseUrl}/auth/v1/recover`);
    recoverUrl.searchParams.set("redirect_to", redirectTo);
    fetch(recoverUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        ...(serviceKey ? { Authorization: `Bearer ${serviceKey}` } : {}),
      },
      body: JSON.stringify({ email: sessionEmail.trim() }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, source: "confirm_payment" });
}
