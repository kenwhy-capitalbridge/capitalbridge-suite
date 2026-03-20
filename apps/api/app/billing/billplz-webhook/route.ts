import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { verifyBillplzWebhookSignature } from "@/lib/billplz";
import { loadPlanMap, getPlanDuration } from "@cb/advisory-graph/plans/planMap";
import { computeExpiry } from "@cb/advisory-graph/plans/expiry";
import { insertBillplzPaymentThenActivate } from "@/lib/billplzActivateFromPayment";
import { sendRecoveryEmailAfterPayment } from "@/lib/billingRecoveryEmail";
import { withRecoveryEmailOncePerBill } from "@/lib/recoveryEmailOncePerBill";

export const runtime = "nodejs";

function logBillingEvent(
  svc: Awaited<ReturnType<typeof createServiceClient>>,
  payload: { event_type: string; user_id?: string | null; membership_id?: string | null; payment_id?: string | null; metadata?: Record<string, unknown> }
) {
  return svc
    .schema("public")
    .from("billing_events")
    .insert({
      event_type: payload.event_type,
      user_id: payload.user_id ?? null,
      membership_id: payload.membership_id ?? null,
      payment_id: payload.payment_id ?? null,
      metadata: (payload.metadata ?? null) as Record<string, unknown> | null,
    })
    .then(() => {}, () => {});
}

export async function POST(req: Request) {
  const svc = createServiceClient();
  await loadPlanMap(svc);

  const body = (await req
    .formData()
    .then((fd) => Object.fromEntries(fd.entries()))
    .catch(async () => {
      return (await req.json().catch(() => ({}))) as Record<string, unknown>;
    })) as Record<string, unknown>;

  const billIdRaw = body["id"] ?? body["bill_id"] ?? body["billplz[id]"] ?? body["billplz_id"];
  const billId = typeof billIdRaw === "string" ? billIdRaw.trim() : billIdRaw != null ? String(billIdRaw).trim() : "";
  const paidRaw = (body["paid"] ?? body["billplz[paid]"]) as string | undefined;
  const paid = paidRaw === "true" || paidRaw === "1";
  const paidAt = (body["paid_at"] ?? body["billplz[paid_at]"]) as string | undefined;
  const amount = (body["amount"] ?? body["billplz[amount]"]) as string | undefined;

  console.info("[billplz-webhook] received", { billId, payloadKeys: Object.keys(body) });

  logBillingEvent(svc, {
    event_type: "webhook_received_raw",
    metadata: {
      billplz_bill_id: billId || null,
      paid,
      payload_keys: Object.keys(body),
      signature_present: !!(
        body["x_signature"] ??
        body["billplz[x_signature]"] ??
        req.headers.get("x-signature")
      ),
    },
  });

  if (!billId) {
    return NextResponse.json({ ok: false, error: "missing_bill_id" }, { status: 400 });
  }

  const signature =
    (body["x_signature"] ?? body["billplz[x_signature]"] ?? req.headers.get("x-signature")) as string | undefined;
  if (!verifyBillplzWebhookSignature(body, signature ?? null)) {
    console.warn("[billplz-webhook] signature verification failed", { bill_id: billId });
    logBillingEvent(svc, {
      event_type: "webhook_invalid_signature",
      metadata: { billplz_bill_id: billId, paid },
    });
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  logBillingEvent(svc, {
    event_type: "webhook_received",
    metadata: { billplz_bill_id: billId, paid },
  });

  // 0) Payment-first billing_sessions: find by bill_id (accept pending, bill_created, or paid — no status filter so we always find and then check idempotency)
  const { data: sessionByBill, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, email, plan_id, status, user_id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionErr) {
    console.warn("[billplz-webhook] billing_sessions query error", { billId, error: sessionErr.message });
    if (process.env.NODE_ENV !== "production") {
      console.warn("Billing debug:", {
        area: "billing",
        op: "billing_sessions:select",
        status: sessionErr.code ?? null,
        code: sessionErr.code ?? null,
        message: sessionErr.message ?? null,
      });
    }
  } else {
    console.info("[billplz-webhook] billing_sessions lookup", {
      billId,
      found: !!sessionByBill,
      sessionId: sessionByBill?.id,
      status: sessionByBill?.status,
    });
  }

  if (!sessionErr && sessionByBill) {
    const billingSessionId = sessionByBill.id;
    // Section 5: Idempotency — already paid
    if (sessionByBill.status === "paid") {
      console.info("[billplz-webhook] idempotent paid", { bill_id: billId, billing_session_id: billingSessionId });
      return NextResponse.json({ ok: true });
    }
    if (!paid) {
      return NextResponse.json({ ok: true });
    }

    const now = new Date().toISOString();
    const amountNum = amount != null ? Number(amount) : null;

    // Section 6: Update billing_sessions
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
      .eq("id", billingSessionId);

    const preUserId = sessionByBill.user_id as string | null | undefined;
    if (!preUserId) {
      console.error("[billplz-webhook] billing_sessions missing user_id", { bill_id: billId, billing_session_id: billingSessionId });
      return NextResponse.json({ ok: false, error: "missing_user_id" }, { status: 400 });
    }

    const { data: authWrap, error: guErr } = await svc.auth.admin.getUserById(preUserId);
    if (guErr || !authWrap?.user?.id) {
      console.error("[billplz-webhook] invalid user_id on billing_session", { bill_id: billId, user_id: preUserId });
      return NextResponse.json({ ok: false, error: "invalid_user" }, { status: 400 });
    }

    const userId = authWrap.user.id;
    const userEmail = (authWrap.user.email ?? "").trim();
    if (!userEmail) {
      console.error("[billplz-webhook] user has no email", { bill_id: billId, user_id: userId });
      return NextResponse.json({ ok: false, error: "user_missing_email" }, { status: 400 });
    }
    console.info("[billplz-webhook] payment-first session user resolved", { bill_id: billId, user_id: userId });

    const { data: planRow } = await svc
      .schema("public")
      .from("plans")
      .select("id, is_trial, slug")
      .eq("id", sessionByBill.plan_id)
      .maybeSingle();

    if (!planRow?.slug) {
      console.error("[billplz-webhook] plan not found or missing slug", {
        bill_id: billId,
        billing_session_id: billingSessionId,
        plan_id: sessionByBill.plan_id,
      });
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
      amountCents: amountNum,
      paymentConfirmedAtIso: now,
      rawWebhook: body as Record<string, unknown>,
      billingSessionId: billingSessionId,
    });

    if (!activate.ok) {
      console.error("[billplz-webhook] payment insert / activate_membership_for_billplz failed", {
        bill_id: billId,
        billing_session_id: billingSessionId,
        error: activate.error,
      });
      return NextResponse.json(
        { ok: false, error: "payment_or_activate_failed", detail: activate.error },
        { status: 500 }
      );
    }

    const membershipId = activate.membershipId ?? null;
    if (!membershipId) {
      console.error("[billplz-webhook] activate succeeded but missing membership_id", { bill_id: billId });
      return NextResponse.json({ ok: false, error: "membership_id_missing" }, { status: 500 });
    }

    await svc
      .schema("public")
      .from("billing_sessions")
      .update({ user_id: userId, membership_id: membershipId, updated_at: now })
      .eq("id", billingSessionId);

    // Section 10: Record payment_events
    await svc
      .schema("public")
      .from("payment_events")
      .insert({
        billing_session_id: billingSessionId,
        event_type: "payment_confirmed",
        event_payload: body as Record<string, unknown>,
      })
      .then(() => {}, () => {});

    if (planRow.is_trial) {
      void svc.rpc("increment_trial_use_count" as never, { user_id: userId }).then(() => {}, () => {});
    }

    try {
      const { data: uwrap } = await svc.auth.admin.getUserById(userId);
      const meta = { ...(uwrap?.user?.user_metadata ?? {}), checkout_pending: false };
      await svc.auth.admin.updateUserById(userId, { user_metadata: meta });
    } catch (e) {
      console.warn("[billplz-webhook] user metadata update skipped", e);
    }

    await svc
      .schema("public")
      .from("profiles")
      .upsert(
        { id: userId, email: userEmail, payment_status: "active", pending_plan: null },
        { onConflict: "id" }
      );

    await withRecoveryEmailOncePerBill(svc, billId, () =>
      sendRecoveryEmailAfterPayment(svc, userId, userEmail)
    ).catch((e) => console.error("[billplz-webhook] recovery email failed", e));
    return NextResponse.json({ ok: true });
  }

  // 1) Billing session flow: payment row exists (authenticated billing/create)
  const { data: payment, error: paymentErr } = await svc
    .schema("public")
    .from("payments")
    .select("id, membership_id, status")
    .eq("billplz_bill_id", billId)
    .maybeSingle();

  if (!paymentErr && payment) {
    // PART 4: Idempotent — already processed
    if (payment.status === "paid") {
      return NextResponse.json({ ok: true });
    }

    const newStatus = paid ? "paid" : "failed";
    const paidAtVal = paidAt ?? (paid ? new Date().toISOString() : null);
    const amountNum = amount != null ? Number(amount) : null;
    await svc
      .schema("public")
      .from("payments")
      .update({
        status: newStatus,
        paid_at: paidAtVal,
        amount_cents: amountNum,
        raw_webhook: body as Record<string, unknown>,
        payment_provider: "billplz",
        payment_currency: "MYR",
        payment_amount: amountNum != null ? amountNum / 100 : null,
        payment_confirmed_at: paid ? paidAtVal : null,
      })
      .eq("id", payment.id);

    // pending → failed when payment fails or expires
    if (!paid && payment.membership_id) {
      await svc
        .schema("public")
        .from("memberships")
        .update({ status: "failed" })
        .eq("id", payment.membership_id)
        .in("status", ["pending", "bill_created"]);
    }

    if (paid) {
      logBillingEvent(svc, {
        event_type: "payment_succeeded",
        membership_id: payment.membership_id,
        payment_id: payment.id,
        metadata: { billplz_bill_id: billId },
      });

      // Mark billing session as paid (idempotent; no-op if table or row missing)
      await svc
        .schema("public")
        .from("billing_sessions")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("bill_id", billId)
        .then(() => {}, () => {});

      const { data: membership } = await svc
        .schema("public")
        .from("memberships")
        .select("id, plan_id, user_id, status")
        .eq("id", payment.membership_id)
        .maybeSingle();

      if (membership) {
        // PART 5: Only activate if not already active (strict state transition)
        if (membership.status === "active") {
          return NextResponse.json({ ok: true });
        }

        const { data: plan } = await svc
          .schema("public")
          .from("plans")
          .select("id, is_trial")
          .eq("id", membership.plan_id)
          .maybeSingle();

        const start = new Date();
        const days = plan ? getPlanDuration(plan.id, 7) : 7;
        const end = computeExpiry(start, days);

        await svc
          .schema("public")
          .from("memberships")
          .update({
            status: "active",
            start_date: start.toISOString(),
            end_date: end ? end.toISOString() : null,
            started_at: start.toISOString(),
            expires_at: end ? end.toISOString() : null,
          })
          .eq("id", membership.id);

        logBillingEvent(svc, {
          event_type: "membership_activated",
          user_id: membership.user_id,
          membership_id: membership.id,
          payment_id: payment.id,
          metadata: { billplz_bill_id: billId },
        });

        if (plan?.is_trial && membership.user_id) {
          void svc.rpc("increment_trial_use_count" as never, { user_id: membership.user_id }).then(() => {}, () => {});
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  console.warn("[billplz-webhook] no billing_sessions or payments row for bill", { billId });
  logBillingEvent(svc, {
    event_type: "webhook_unmatched_bill",
    metadata: { billplz_bill_id: billId, paid },
  });
  return NextResponse.json({ ok: false, error: "payment_not_found" }, { status: 404 });
}
