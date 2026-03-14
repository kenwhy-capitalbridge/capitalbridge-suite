import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { createBillplzBill } from "@/lib/billplz";

export const runtime = "nodejs";

/**
 * @deprecated Use login app same-origin endpoint: POST login.thecapitalbridge.com/api/bill/create
 * This route is kept for reference; all payment creation should go through the login app.
 */
type Body = { plan?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const requestedPlan = (body.plan ?? "trial").toString();

    // Supabase is the source of truth: user identity comes from the access token
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const svc = createServiceClient();

  const {
    data: { user },
    error: userError,
  } = await svc.auth.getUser(token ?? undefined);

  if (userError || !user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Fetch plan details
  const { data: planRow, error: planErr } = await svc
    .from("plans")
    .select("id, slug, name, price_cents, duration_days, is_trial")
    .eq("slug", requestedPlan)
    .maybeSingle();

  if (planErr || !planRow) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
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
      return NextResponse.json({ error: "trial_limit_reached" }, { status: 403 });
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
      return NextResponse.json({ error: "membership_create_failed" }, { status: 500 });
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

  return NextResponse.json({ checkoutUrl });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

