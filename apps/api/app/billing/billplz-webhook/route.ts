import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { randomBytes } from "crypto";
import { verifyBillplzWebhookSignature } from "@/lib/billplz";
import { loadPlanMap, getPlanDuration } from "@cb/advisory-graph/plans/planMap";
import { computeExpiry } from "@cb/advisory-graph/plans/expiry";

export const runtime = "nodejs";

/** Login app URL for password reset redirect (must be in Supabase Auth → URL Configuration). */
function getResetPasswordRedirectUrl(): string {
  const base =
    process.env.LOGIN_APP_URL ??
    process.env.NEXT_PUBLIC_LOGIN_APP_URL ??
    "https://login.thecapitalbridge.com";
  return `${base.replace(/\/$/, "")}/reset-password`;
}

/**
 * Trigger Supabase Auth to send a "set password" (recovery) email to the user.
 * Uses the project's SMTP (e.g. Resend). Tries service_role first (API already has it), then anon.
 */
async function sendSetPasswordEmail(email: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = serviceKey ?? anonKey;
  if (!url || !apiKey) {
    console.warn(
      "[billplz-webhook] skip set-password email: missing NEXT_PUBLIC_SUPABASE_URL or both SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    return;
  }
  const redirectTo = getResetPasswordRedirectUrl();
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
      console.warn("[billplz-webhook] recover request failed", {
        status: res.status,
        email,
        detail: text.slice(0, 300),
      });
      return;
    }
    console.info("[billplz-webhook] set-password email triggered", { email });
  } catch (err) {
    console.warn("[billplz-webhook] sendSetPasswordEmail error", err);
  }
}

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
    .select("id, email, plan_id, status")
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

    const sessionEmail = sessionByBill.email?.trim();
    if (!sessionEmail) {
      console.error("[billplz-webhook] billing_sessions missing email", { bill_id: billId, billing_session_id: billingSessionId });
      return NextResponse.json({ ok: true });
    }

    // Section 7: Create Supabase user (reuse if exists)
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
          console.info("[billplz-webhook] reused existing user", { bill_id: billId, billing_session_id: billingSessionId, user_id: userId });
        } else {
          console.error("[billplz-webhook] user creation failed (exists but not found)", { bill_id: billId, billing_session_id: billingSessionId });
          return NextResponse.json({ ok: false, error: "user_creation_failed" }, { status: 500 });
        }
      } else {
        console.error("[billplz-webhook] user creation failed", { bill_id: billId, billing_session_id: billingSessionId, error: createUserErr?.message });
        return NextResponse.json({ ok: false, error: "user_creation_failed" }, { status: 500 });
      }
    } else {
      userId = authUser.user.id;
      console.info("[billplz-webhook] user created", { bill_id: billId, billing_session_id: billingSessionId, user_id: userId });
    }

    const { data: planRow } = await svc
      .schema("public")
      .from("plans")
      .select("id, is_trial")
      .eq("id", sessionByBill.plan_id)
      .maybeSingle();

    if (!planRow) {
      console.error("[billplz-webhook] plan not found", { bill_id: billId, billing_session_id: billingSessionId, plan_id: sessionByBill.plan_id });
      return NextResponse.json({ ok: true });
    }

    // Section 8: Upsert profile (id, email, trial_use_count when trial)
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

    const start = new Date();
    const days = getPlanDuration(planRow.id, 7);
    const end = computeExpiry(start, days);

    // Section 9: Create membership (idempotent: check by billing_session_id)
    const { data: existingMembership } = await svc
      .schema("public")
      .from("memberships")
      .select("id")
      .eq("billing_session_id", billingSessionId)
      .maybeSingle();

    let membershipId: string | null = null;
    if (existingMembership?.id) {
      membershipId = existingMembership.id;
      console.info("[billplz-webhook] membership already exists", { bill_id: billId, billing_session_id: billingSessionId, membership_id: membershipId });
    } else {
      const { data: newMembership, error: membershipErr } = await svc
        .schema("public")
        .from("memberships")
        .insert({
          user_id: userId,
          plan_id: planRow.id,
          status: "active",
          billing_session_id: billingSessionId,
          start_date: start.toISOString(),
          end_date: end ? end.toISOString() : null,
          started_at: start.toISOString(),
          expires_at: end ? end.toISOString() : null,
        })
        .select("id")
        .single();

      if (membershipErr || !newMembership?.id) {
        console.error("[billplz-webhook] membership create failed", { bill_id: billId, billing_session_id: billingSessionId, error: membershipErr?.message });
        return NextResponse.json({ ok: false, error: "membership_create_failed" }, { status: 500 });
      }
      membershipId = newMembership.id;
      console.info("[billplz-webhook] membership created", { bill_id: billId, billing_session_id: billingSessionId, membership_id: membershipId });
    }

    // Link session to user and membership
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

    // Section 13: trigger "set password" email via Supabase Auth recover (uses project SMTP e.g. Resend)
    void sendSetPasswordEmail(sessionEmail);
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

  // 2) Payment-first flow: pending_bills — create Supabase user only after payment
  const { data: pendingBill, error: pendingErr } = await svc
    .schema("public")
    .from("pending_bills")
    .select("id, email, plan_id, name")
    .eq("billplz_bill_id", billId)
    .maybeSingle();

  if (pendingErr || !pendingBill) {
    console.warn("[billplz-webhook] no billing_sessions, payments, or pending_bills found", { billId });
    logBillingEvent(svc, {
      event_type: "webhook_unmatched_bill",
      metadata: { billplz_bill_id: billId, paid },
    });
    return NextResponse.json({ ok: false, error: "payment_or_pending_not_found" }, { status: 404 });
  }

  if (!paid) {
    return NextResponse.json({ ok: true });
  }

  const { data: planRow } = await svc
    .schema("public")
    .from("plans")
    .select("id, is_trial")
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

  const { data: profileRow } = await svc.schema("public").from("profiles").select("trial_use_count").eq("id", userId).maybeSingle();
  const currentTrialCount = profileRow?.trial_use_count ?? 0;
  const newTrialCount = planRow.is_trial ? currentTrialCount + 1 : currentTrialCount;

  await svc.schema("public").from("profiles").upsert(
    { id: userId, trial_use_count: newTrialCount },
    { onConflict: "id" }
  );

  const start = new Date();
  const days = getPlanDuration(planRow.id, 7);
  const end = computeExpiry(start, days);

  const { data: newMembership, error: membershipErr } = await svc
    .schema("public")
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

  await svc.schema("public").from("payments").insert({
    membership_id: newMembership.id,
    billplz_bill_id: billId,
    billplz_collection_id: process.env.BILLPLZ_COLLECTION_ID ?? null,
    status: "paid",
    paid_at: paidAt ?? new Date().toISOString(),
    amount_cents: amount ? Number(amount) : null,
    raw_webhook: body as any,
  });

  await svc.schema("public").from("pending_bills").delete().eq("id", pendingBill.id);

  void sendSetPasswordEmail(pendingBill.email);
  return NextResponse.json({ ok: true });
}
