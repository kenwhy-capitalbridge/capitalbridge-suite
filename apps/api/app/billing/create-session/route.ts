import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { createBillplzBill } from "@/lib/billplz";

export const runtime = "nodejs";

const DEFAULT_LOGIN = "https://login.thecapitalbridge.com";

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const o = origin.toLowerCase();
  return (
    o === DEFAULT_LOGIN ||
    o.startsWith("https://login.thecapitalbridge.com") ||
    o.startsWith("http://localhost:") ||
    o.startsWith("http://127.0.0.1:")
  );
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : DEFAULT_LOGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("Origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

type Body = { email?: string; plan?: string; name?: string };

async function createPendingBillFallback(params: {
  svc: ReturnType<typeof createServiceClient>;
  headers: Record<string, string>;
  email: string;
  name: string;
  planId: string;
  planName: string;
  amountCents: number;
  billingSessionError?: { message?: string; details?: string } | null;
}) {
  const { svc, headers, email, name, planId, planName, amountCents, billingSessionError } = params;

  const { data: pendingBill, error: pendingErr } = await svc
    .from("pending_bills")
    .insert({
      email,
      plan_id: planId,
      name: name || email,
    })
    .select("id")
    .single();

  if (pendingErr || !pendingBill?.id) {
    console.error("[create-session] pending_bills insert failed:", pendingErr, "billing_sessions error was:", billingSessionError?.message);
    return NextResponse.json(
      {
        error: "session_create_failed",
        message: "Could not create billing session. Run the payment-first migration on Supabase (billing_sessions.email, nullable user_id) and ensure pending_bills table exists.",
        detail: pendingErr?.message ?? "pending_bills insert failed",
        ...(billingSessionError?.message && { billing_session_error: billingSessionError.message }),
      },
      { status: 500, headers }
    );
  }

  let paymentUrl: string;
  let billId: string;
  try {
    const result = await createBillplzBill({
      amountCents,
      description: `Capital Bridge — ${planName}`,
      email,
      name: name || email,
      reference1: pendingBill.id,
      redirectUrl: process.env.BILLPLZ_REDIRECT_URL ?? "https://platform.thecapitalbridge.com/dashboard",
    });
    paymentUrl = result.checkoutUrl;
    billId = result.billId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const body = err && typeof err === "object" && "body" in err ? String((err as { body?: string }).body) : undefined;
    console.error("[create-session] Billplz fallback error:", message, body ? { billplz_response: body } : "");
    return NextResponse.json(
      {
        error: "bill_creation_failed",
        message: "Payment provider could not create the bill.",
        ...(body && { detail: body }),
      },
      { status: 502, headers }
    );
  }

  const { error: updatePendingErr } = await svc
    .from("pending_bills")
    .update({ billplz_bill_id: billId })
    .eq("id", pendingBill.id);

  if (updatePendingErr) {
    console.error("[create-session] pending_bills update failed:", updatePendingErr);
    return NextResponse.json(
      { error: "session_update_failed", detail: updatePendingErr.message },
      { status: 500, headers }
    );
  }

  return NextResponse.json(
    { payment_url: paymentUrl, checkoutUrl: paymentUrl, mode: "pending_bills_fallback" },
    { headers }
  );
}

/**
 * Payment-first: create billing_sessions row with email + plan, then Billplz bill.
 * Returns payment_url for frontend redirect. No Supabase user is created here.
 * Requires BILLPLZ_API_KEY and BILLPLZ_COLLECTION_ID (loaded from env).
 */
export async function POST(req: Request) {
  const origin = req.headers.get("Origin");
  const headers = corsHeaders(origin);

  if (!process.env.BILLPLZ_API_KEY || !process.env.BILLPLZ_COLLECTION_ID) {
    console.error("[create-session] missing env: BILLPLZ_API_KEY or BILLPLZ_COLLECTION_ID");
    return NextResponse.json(
      { error: "billplz_config_missing", message: "Payment provider is not configured." },
      { status: 503, headers }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const requestedPlan = (body.plan ?? "trial").toString();
  const name = typeof body.name === "string" ? body.name.trim() : email || "Customer";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400, headers });
  }

  const svc = createServiceClient();

  const { data: planRow, error: planErr } = await svc
    .from("plans")
    .select("id, slug, name, price_cents, duration_days, is_trial")
    .eq("slug", requestedPlan)
    .maybeSingle();

  if (planErr || !planRow) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400, headers });
  }

  const { data: session, error: sessionErr } = await svc
    .from("billing_sessions")
    .insert({
      email,
      plan_id: planRow.id,
      status: "pending",
      payment_attempt_count: 0,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessionErr || !session?.id) {
    console.error("[create-session] billing_sessions insert failed:", sessionErr?.message, sessionErr?.details);
    return createPendingBillFallback({
      svc,
      headers,
      email,
      name,
      planId: planRow.id,
      planName: planRow.name,
      amountCents: planRow.price_cents,
      billingSessionError: sessionErr ? { message: sessionErr.message, details: sessionErr.details as string } : null,
    });
  }

  let billId: string;
  let paymentUrl: string;
  try {
    const result = await createBillplzBill({
      amountCents: planRow.price_cents,
      description: `Capital Bridge — ${planRow.name}`,
      email,
      name: name || email,
      reference1: session.id,
      redirectUrl: process.env.BILLPLZ_REDIRECT_URL ?? "https://platform.thecapitalbridge.com/dashboard",
    });
    billId = result.billId;
    paymentUrl = result.checkoutUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const body = err && typeof err === "object" && "body" in err ? String((err as { body?: string }).body) : undefined;
    console.error("[create-session] Billplz error:", message, body ? { billplz_response: body } : "");
    await svc
      .from("billing_sessions")
      .update({
        last_payment_error: "bill_creation_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    return NextResponse.json(
      {
        error: "bill_creation_failed",
        message: "Payment provider could not create the bill.",
        ...(body && { detail: body }),
      },
      { status: 502, headers }
    );
  }

  await svc
    .from("billing_sessions")
    .update({
      bill_id: billId,
      payment_url: paymentUrl,
      status: "bill_created",
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  return NextResponse.json({ payment_url: paymentUrl, checkoutUrl: paymentUrl }, { headers });
}
