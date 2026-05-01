import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { getBillplzBill } from "@/lib/billplz";
import {
  billingSessionSelectColumns,
  billingSessionsCheckoutMetadataColumnAvailable,
  type BillingSessionFinalizeSelectRow,
} from "@/lib/billingSessionsCheckoutMetadataColumn";
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

  const metaCol = await billingSessionsCheckoutMetadataColumnAvailable(svc);
  const { data: sessionRow, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select(billingSessionSelectColumns(metaCol))
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
  }

  const session = sessionRow as unknown as BillingSessionFinalizeSelectRow;
  const checkoutRaw = metaCol ? session.checkout_metadata : undefined;
  const checkoutMeta = parseCheckoutMetadata(checkoutRaw ?? null);
  const intent = typeof checkoutMeta?.intent === "string" ? checkoutMeta.intent.trim() : "";

  if (session.status === "paid" && session.membership_id) {
    return NextResponse.json({ ok: true, already_processed: true });
  }

  if (session.status === "paid" && intent === "market_change") {
    return NextResponse.json({ ok: true, already_processed: true, source: "market_change" });
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

  const ensuredUser = await ensureBillingSessionUser({
    svc,
    billingSessionId: session.id,
  });
  if (!ensuredUser.ok) {
    return NextResponse.json({ ok: false, error: "user_create_failed", detail: ensuredUser.error }, { status: 500 });
  }

  const userId = ensuredUser.userId;
  const sessionEmail = typeof session.email === "string" ? session.email.trim() : "";
  const authEmail = ensuredUser.email.trim();
  if (sessionEmail && authEmail && normalizeEmail(sessionEmail) !== normalizeEmail(authEmail)) {
    return NextResponse.json({ ok: false, error: "email_mismatch" }, { status: 409 });
  }
  const userEmail = sessionEmail || authEmail;
  if (!userEmail) {
    return NextResponse.json({ ok: false, error: "user_missing_email" }, { status: 400 });
  }

  const finalized = await finalizePaidBillingSession({
    svc,
    billingSessionId: session.id,
    userId,
    userEmail,
    checkoutMetadata: checkoutMeta,
  });

  if (!finalized.ok) {
    console.error("[confirm-payment] finalize failed", {
      billId,
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
    } catch {
      /* noop */
    }
  }

  return NextResponse.json({ ok: true, source: "confirm_payment" });
}
