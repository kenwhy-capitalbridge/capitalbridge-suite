import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { createAppServerClient } from "@cb/supabase/server";
import { createBillplzBill } from "@/lib/billplz";
import { LOGIN_APP_URL } from "@cb/shared/urls";

export const runtime = "nodejs";

const CORS_ORIGINS = [
  LOGIN_APP_URL,
  "http://localhost:3001",
  "http://localhost:3006",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3006",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && CORS_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allow ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("Origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

type Body = { plan?: string };

export async function POST(req: Request) {
  const origin = req.headers.get("Origin");
  const headers = corsHeaders(origin);

  const body = (await req.json().catch(() => ({}))) as Body;
  const requestedPlan = (body.plan ?? "trial").toString();

  // Supabase is the source of truth: user identity comes only from the Supabase session (shared .thecapitalbridge.com cookie).
  const sessionClient = await createAppServerClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }

  const svc = createServiceClient();

  // Fetch plan details
  const { data: planRow, error: planErr } = await svc
    .from("plans")
    .select("id, slug, name, price_cents, duration_days, is_trial")
    .eq("slug", requestedPlan)
    .maybeSingle();

  if (planErr || !planRow) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400, headers });
  }

  // Trial enforcement (max 3)
  if (planRow.is_trial) {
    const { data: profile } = await svc
      .from("profiles")
      .select("trial_use_count")
      .eq("id", user.id)
      .maybeSingle();
    const used = profile?.trial_use_count ?? 0;
    if (used >= 3) {
      return NextResponse.json({ error: "trial_limit_reached" }, { status: 403, headers });
    }
  }

  // Ensure a pending membership exists for this user + plan
  const { data: existingPending } = await svc
    .from("memberships")
    .select("id, status, plan_id")
    .eq("user_id", user.id)
    .eq("plan_id", planRow.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let membershipId = existingPending?.id;
  if (!membershipId) {
    const { data: created, error: createErr } = await svc
      .from("memberships")
      .insert({
        user_id: user.id,
        plan_id: planRow.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (createErr || !created?.id) {
      return NextResponse.json({ error: "membership_create_failed" }, { status: 500, headers });
    }
    membershipId = created.id;
  }

  // Create Billplz bill
  const { billId, checkoutUrl } = await createBillplzBill({
    amountCents: planRow.price_cents,
    description: `Capital Bridge — ${planRow.name}`,
    email: user.email ?? "client@thecapitalbridge.com",
    name: user.email ?? "Capital Bridge Client",
    reference1: membershipId,
    redirectUrl: "https://platform.thecapitalbridge.com/dashboard",
  });

  // Upsert payment record
  await svc.from("payments").upsert(
    {
      membership_id: membershipId,
      billplz_bill_id: billId,
      billplz_collection_id: process.env.BILLPLZ_COLLECTION_ID ?? null,
      status: "pending",
      amount_cents: planRow.price_cents,
    },
    { onConflict: "membership_id" }
  );

  return NextResponse.json({ checkoutUrl }, { headers });
}

