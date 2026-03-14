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

/**
 * Payment-first: create billing_sessions row with email + plan, then Billplz bill.
 * No Supabase user is created here. User is created only after webhook confirms payment.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("Origin");
  const headers = corsHeaders(origin);

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

  // Section 2: Create billing_sessions row (email, plan, status = pending, payment_attempt_count = 0)
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
    console.error("[request-bill] billing_sessions insert failed:", sessionErr);
    return NextResponse.json({ error: "session_create_failed" }, { status: 500, headers });
  }

  let billId: string;
  let checkoutUrl: string;
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
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    console.error("[request-bill] Billplz error:", err);
    await svc
      .from("billing_sessions")
      .update({
        last_payment_error: "bill_creation_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    return NextResponse.json({ error: "bill_creation_failed" }, { status: 502, headers });
  }

  // Section 2: Save bill_id, status = bill_created
  await svc
    .from("billing_sessions")
    .update({
      bill_id: billId,
      payment_url: checkoutUrl,
      status: "bill_created",
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  return NextResponse.json({ checkoutUrl }, { headers });
}
