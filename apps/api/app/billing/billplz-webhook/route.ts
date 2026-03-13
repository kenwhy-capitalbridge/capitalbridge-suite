import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";

export const runtime = "nodejs";

type BillplzWebhookBody = Record<string, string | undefined> & {
  id?: string;
  paid?: string;
  paid_at?: string;
  amount?: string;
  x_signature?: string;
};

export async function POST(req: Request) {
  const svc = createServiceClient();

  const body = (await req
    .formData()
    .then((fd) => Object.fromEntries(fd.entries()))
    .catch(async () => {
      // Billplz can send urlencoded; fallback to JSON if needed.
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

  // Find payment by bill id
  const { data: payment, error: paymentErr } = await svc
    .from("payments")
    .select("id, membership_id, status")
    .eq("billplz_bill_id", billId)
    .maybeSingle();

  if (paymentErr || !payment) {
    return NextResponse.json({ ok: false, error: "payment_not_found" }, { status: 404 });
  }

  // Idempotency: if already paid, acknowledge
  if (payment.status === "paid") {
    return NextResponse.json({ ok: true });
  }

  const newStatus = paid ? "paid" : "failed";
  await svc
    .from("payments")
    .update({
      status: newStatus,
      paid_at: paidAt ?? null,
      amount_cents: amount ? Number(amount) : null,
      raw_webhook: body as any,
    })
    .eq("id", payment.id);

  if (paid) {
    // Activate membership for its plan duration
    const { data: membership } = await svc
      .from("memberships")
      .select("id, plan_id")
      .eq("id", payment.membership_id)
      .maybeSingle();

    if (membership) {
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
        })
        .eq("id", membership.id);

      if (plan?.is_trial) {
        // increment trial_use_count
        await svc.rpc("increment_trial_use_count" as any, { user_id: (body["user_id"] ?? null) as any }).catch(() => {
          // ignore if RPC doesn't exist; schema trigger can handle this in DB
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

