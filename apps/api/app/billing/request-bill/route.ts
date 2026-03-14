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
 * Create a Billplz bill without requiring a logged-in user.
 * No Supabase user or email is created here — only a pending_bills row.
 * The Supabase account is created only when Billplz confirms payment (webhook).
 * This avoids "account already exists" if the user abandons and retries with the same email.
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

  const { data: pendingBill, error: insertErr } = await svc
    .from("pending_bills")
    .insert({
      email,
      plan_id: planRow.id,
      name: name || email,
    })
    .select("id")
    .single();

  if (insertErr || !pendingBill?.id) {
    return NextResponse.json({ error: "pending_bill_create_failed" }, { status: 500, headers });
  }

  let billId: string;
  let checkoutUrl: string;
  try {
    const result = await createBillplzBill({
      amountCents: planRow.price_cents,
      description: `Capital Bridge — ${planRow.name}`,
      email,
      name: name || email,
      reference1: pendingBill.id,
      redirectUrl: "https://platform.thecapitalbridge.com/dashboard",
    });
    billId = result.billId;
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    await svc.from("pending_bills").delete().eq("id", pendingBill.id);
    return NextResponse.json({ error: "bill_creation_failed" }, { status: 502, headers });
  }

  await svc
    .from("pending_bills")
    .update({ billplz_bill_id: billId })
    .eq("id", pendingBill.id);

  return NextResponse.json({ checkoutUrl }, { headers });
}
