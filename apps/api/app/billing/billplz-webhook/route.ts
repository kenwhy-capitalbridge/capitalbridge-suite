import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

function logBillingEvent(
  svc: Awaited<ReturnType<typeof createServiceClient>>,
  payload: { event_type: string; user_id?: string | null; membership_id?: string | null; payment_id?: string | null; metadata?: Record<string, unknown> }
) {
  return svc
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

  const body = (await req
    .formData()
    .then((fd) => Object.fromEntries(fd.entries()))
    .catch(async () => {
      return (await req.json().catch(() => ({}))) as Record<string, unknown>;
    })) as Record<string, unknown>;

  const billId = (body["id"] ?? body["billplz[id]"] ?? body["billplz_id"]) as string | undefined;
  const paidRaw = (body["paid"] ?? body["billplz[paid]"]) as string | undefined;
  const paid = paidRaw === "true" || paidRaw === "1";
  const paidAt = (body["paid_at"] ?? body["billplz[paid_at]"]) as string | undefined;
  const amount = (body["amount"] ?? body["billplz[amount]"]) as string | undefined;

  if (!billId) {
    return NextResponse.json({ ok: false, error: "missing_bill_id" }, { status: 400 });
  }

  logBillingEvent(svc, {
    event_type: "webhook_received",
    metadata: { billplz_bill_id: billId, paid },
  });

  // 1) Billing session flow: payment row exists (authenticated billing/create)
  const { data: payment, error: paymentErr } = await svc
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
        .from("memberships")
        .update({ status: "failed", updated_at: new Date().toISOString() })
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
        .from("billing_sessions")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("bill_id", billId)
        .then(() => {}, () => {});

      const { data: membership } = await svc
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
          .from("plans")
          .select("duration_days, is_trial")
          .eq("id", membership.plan_id)
          .maybeSingle();

        const start = new Date();
        const end =
          plan?.duration_days != null
            ? new Date(start.getTime() + plan.duration_days * 24 * 60 * 60 * 1000)
            : null;

        await svc
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
          await svc.rpc("increment_trial_use_count" as never, { user_id: membership.user_id }).catch(() => {});
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  // 2) Payment-first flow: pending_bills — create Supabase user only after payment
  const { data: pendingBill, error: pendingErr } = await svc
    .from("pending_bills")
    .select("id, email, plan_id, name")
    .eq("billplz_bill_id", billId)
    .maybeSingle();

  if (pendingErr || !pendingBill) {
    return NextResponse.json({ ok: false, error: "payment_or_pending_not_found" }, { status: 404 });
  }

  if (!paid) {
    return NextResponse.json({ ok: true });
  }

  const { data: planRow } = await svc
    .from("plans")
    .select("id, duration_days, is_trial")
    .eq("id", pendingBill.plan_id)
    .maybeSingle();

  if (!planRow) {
    return NextResponse.json({ ok: false, error: "plan_not_found" }, { status: 400 });
  }

  // Create Supabase user only upon payment confirmation (not when payment is pending).
  let userId: string;
  const tempPassword = randomBytes(24).toString("base64url");
  const { data: authUser, error: createUserErr } = await svc.auth.admin.createUser({
    email: pendingBill.email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createUserErr || !authUser?.user?.id) {
    const msg = String(createUserErr?.message ?? "").toLowerCase();
    const isAlreadyExists =
      msg.includes("already") || msg.includes("registered") || msg.includes("exists");
    if (isAlreadyExists) {
      const { data: listData } = await svc.auth.admin.listUsers({ perPage: 1000, page: 1 });
      const existing = listData?.users?.find((u) => (u.email ?? "").toLowerCase() === pendingBill.email.toLowerCase());
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

  const profileRow = await svc.from("profiles").select("trial_use_count").eq("id", userId).maybeSingle();
  const currentTrialCount = profileRow?.trial_use_count ?? 0;
  const newTrialCount = planRow.is_trial ? currentTrialCount + 1 : currentTrialCount;

  await svc.from("profiles").upsert(
    { id: userId, trial_use_count: newTrialCount },
    { onConflict: "id" }
  );

  const start = new Date();
  const end =
    planRow.duration_days != null
      ? new Date(start.getTime() + planRow.duration_days * 24 * 60 * 60 * 1000)
      : null;

  const { data: newMembership, error: membershipErr } = await svc
    .from("memberships")
    .insert({
      user_id: userId,
      plan_id: planRow.id,
      status: "active",
      start_date: start.toISOString(),
      end_date: end ? end.toISOString() : null,
    })
    .select("id")
    .single();

  if (membershipErr || !newMembership?.id) {
    return NextResponse.json({ ok: false, error: "membership_create_failed" }, { status: 500 });
  }

  await svc.from("payments").insert({
    membership_id: newMembership.id,
    billplz_bill_id: billId,
    billplz_collection_id: process.env.BILLPLZ_COLLECTION_ID ?? null,
    status: "paid",
    paid_at: paidAt ?? new Date().toISOString(),
    amount_cents: amount ? Number(amount) : null,
    raw_webhook: body as any,
  });

  await svc.from("pending_bills").delete().eq("id", pendingBill.id);

  return NextResponse.json({ ok: true });
}

