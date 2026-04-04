import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { verifyBillplzWebhookSignature } from "@/lib/billplz";
import { loadPlanMap } from "@cb/advisory-graph/plans/planMap";
import { ensureBillingSessionUser } from "@/lib/ensureBillingSessionUser";
import { finalizePaidBillingSession } from "@/lib/finalizePaidBillingSession";

export const runtime = "nodejs";

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

function parseCheckoutMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
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
  const amount = (body["amount"] ?? body["billplz[amount]"]) as string | undefined;

  console.info("[billplz-webhook] received", { billId, payloadKeys: Object.keys(body) });

  if (!billId) {
    return NextResponse.json({ ok: false, error: "missing_bill_id" }, { status: 400 });
  }

  const signature =
    (body["x_signature"] ?? body["billplz[x_signature]"] ?? req.headers.get("x-signature")) as string | undefined;
  if (!verifyBillplzWebhookSignature(body, signature ?? null)) {
    console.warn("[billplz-webhook] signature verification failed", { bill_id: billId });
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const { data: sessionByBill, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, email, plan_id, status, user_id, membership_id, checkout_metadata")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionErr) {
    console.warn("[billplz-webhook] billing_sessions query error", { billId, error: sessionErr.message });
  }

  if (!sessionByBill) {
    console.warn("[billplz-webhook] no billing_sessions row for bill", { billId });
    return NextResponse.json({ ok: false, error: "billing_session_not_found" }, { status: 404 });
  }

  const billingSessionId = sessionByBill.id;
  const checkoutMeta = parseCheckoutMetadata(sessionByBill.checkout_metadata);

  if (!paid) {
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();
  const amountNum = amount != null ? Number(amount) : null;

  if (sessionByBill.status !== "paid") {
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
  }

  if (sessionByBill.membership_id) {
    console.info("[billplz-webhook] idempotent paid + membership", { bill_id: billId, billing_session_id: billingSessionId });
    return NextResponse.json({ ok: true });
  }

  const ensuredUser = await ensureBillingSessionUser({
    svc,
    billingSessionId,
  });
  if (!ensuredUser.ok) {
    console.error("[billplz-webhook] ensure billing user failed", {
      bill_id: billId,
      billing_session_id: billingSessionId,
      error: ensuredUser.error,
    });
    return NextResponse.json({ ok: false, error: "user_create_failed", detail: ensuredUser.error }, { status: 500 });
  }

  const userId = ensuredUser.userId;
  const sessionEmail = typeof sessionByBill.email === "string" ? sessionByBill.email.trim() : "";
  const authEmail = ensuredUser.email.trim();
  if (sessionEmail && authEmail && normalizeEmail(sessionEmail) !== normalizeEmail(authEmail)) {
    console.error("[billplz-webhook] email mismatch billing_sessions vs auth.users", {
      bill_id: billId,
      billing_session_id: billingSessionId,
    });
    return NextResponse.json({ ok: false, error: "email_mismatch" }, { status: 409 });
  }
  const userEmail = sessionEmail || authEmail;
  if (!userEmail) {
    console.error("[billplz-webhook] no email on billing_session or auth user", { bill_id: billId, user_id: userId });
    return NextResponse.json({ ok: false, error: "user_missing_email" }, { status: 400 });
  }

  const finalized = await finalizePaidBillingSession({
    svc,
    billingSessionId,
    userId,
    userEmail,
    checkoutMetadata: checkoutMeta,
  });

  if (!finalized.ok) {
    console.error("[billplz-webhook] finalize failed", {
      bill_id: billId,
      billing_session_id: billingSessionId,
      error: finalized.error,
    });
    return NextResponse.json(
      { ok: false, error: "billing_finalize_failed", detail: finalized.error },
      { status: 500 }
    );
  }

  if (finalized.kind === "membership") {
    try {
      const { data: uwrap } = await svc.auth.admin.getUserById(userId);
      const meta = { ...(uwrap?.user?.user_metadata ?? {}), checkout_pending: false };
      await svc.auth.admin.updateUserById(userId, { user_metadata: meta });
    } catch (e) {
      console.warn("[billplz-webhook] user metadata update skipped", e);
    }
  }

  return NextResponse.json({ ok: true });
}
