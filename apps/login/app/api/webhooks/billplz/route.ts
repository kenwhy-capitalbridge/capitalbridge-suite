import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";

export const runtime = "nodejs";

function getApiBaseUrl(): string {
  const url =
    process.env.API_APP_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3002" : "https://api.thecapitalbridge.com");
  return url.replace(/\/$/, "");
}

/**
 * Billplz webhook: verify payment, update payment record, activate membership.
 * Idempotent: repeated webhook calls do not create duplicate memberships.
 * No CORS (webhook is server-to-server).
 * When billing_sessions flow is used, forwards to API webhook (which handles set-password email).
 */
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

  await logBillingEvent(svc, {
    event_type: "webhook_received",
    metadata: { billplz_bill_id: billId, paid },
  });

  // 0) billing_sessions flow (payment-first from request-bill): forward to API webhook so it creates user, activates, and sends set-password email
  const { data: sessionByBill } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionByBill) {
    try {
      const apiUrl = `${getApiBaseUrl()}/billing/billplz-webhook`;
      const form = new FormData();
      for (const [k, v] of Object.entries(body)) {
        form.append(k, typeof v === "string" ? v : String(v ?? ""));
      }
      const res = await fetch(apiUrl, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    } catch (err) {
      console.error("[login webhooks/billplz] forward to API failed", err);
      return NextResponse.json({ ok: false, error: "forward_failed" }, { status: 502 });
    }
  }

  // 1) Existing flow: payment row exists (authenticated bill/create)
  const { data: payment, error: paymentErr } = await svc
    .schema("public")
    .from("payments")
    .select("id, membership_id, status")
    .eq("billplz_bill_id", billId)
    .maybeSingle();

  if (!paymentErr && payment) {
    if (payment.status === "paid") {
      return NextResponse.json({ ok: true });
    }
    const newStatus = paid ? "paid" : "failed";
    await svc
      .schema("public")
      .from("payments")
      .update({
        status: newStatus,
        paid_at: paidAt ?? null,
        amount_cents: amount ? Number(amount) : null,
        raw_webhook: body as Record<string, unknown>,
      })
      .eq("id", payment.id);

    if (paid) {
      await logBillingEvent(svc, {
        event_type: "payment_succeeded",
        user_id: null,
        membership_id: payment.membership_id,
        payment_id: payment.id,
        metadata: { billplz_bill_id: billId },
      });
      const { data: membership } = await svc
        .schema("public")
        .from("memberships")
        .select("id, plan_id, user_id")
        .eq("id", payment.membership_id)
        .maybeSingle();

      if (membership) {
        const { data: plan } = await svc
          .schema("public")
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

        await logBillingEvent(svc, {
          event_type: "membership_activated",
          user_id: membership.user_id,
          membership_id: membership.id,
          payment_id: payment.id,
          metadata: { billplz_bill_id: billId },
        });

        if (plan?.is_trial && membership.user_id) {
          await (svc.rpc("increment_trial_use_count", {
            user_id: membership.user_id,
          }) as unknown as Promise<unknown>).catch(() => {});
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  console.warn("[login webhooks/billplz] no billing_sessions or payment row for bill; use API webhook for payment-first", {
    billId,
  });
  return NextResponse.json({ ok: false, error: "payment_not_found" }, { status: 404 });
}

async function logBillingEvent(
  svc: Awaited<ReturnType<typeof createServiceClient>>,
  payload: {
    event_type: string;
    user_id?: string | null;
    membership_id?: string | null;
    payment_id?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await svc.schema("public").from("billing_events").insert({
      event_type: payload.event_type,
      user_id: payload.user_id ?? null,
      membership_id: payload.membership_id ?? null,
      payment_id: payload.payment_id ?? null,
      metadata: payload.metadata ?? null,
    });
  } catch {
    // Table may not exist yet; ignore
  }
}
