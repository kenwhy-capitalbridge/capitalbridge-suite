import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { createBillplzBill } from "@/lib/billplz";

export const runtime = "nodejs";

/**
 * Canonical billing endpoint: creates pending membership, then Billplz bill, then payment record.
 * Called by login app proxy (login server forwards with Bearer token). Auth via JWT.
 */
type Body = { plan?: string };

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "unauthorized", detail: "missing_bearer_token" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const requestedPlan = (body.plan ?? "trial").toString();

    const svc = createServiceClient();
    const {
      data: { user },
      error: userError,
    } = await svc.auth.getUser(token);

    if (userError || !user?.id) {
      return NextResponse.json({ error: "unauthorized", detail: userError?.message ?? "invalid_token" }, { status: 401 });
    }

    const { data: planRow, error: planErr } = await svc
      .from("plans")
      .select("id, slug, name, price_cents, duration_days, is_trial")
      .eq("slug", requestedPlan)
      .maybeSingle();

    if (planErr || !planRow) {
      return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
    }

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

    // 1) Create pending membership first (fault-tolerant: record exists even if Billplz fails later)
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
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createErr || !created?.id) {
        const message = createErr?.message ?? "no id returned";
        console.error("[api/billing/create] membership insert failed:", createErr?.code, message, createErr?.details);
        return NextResponse.json(
          { error: "membership_create_failed", detail: message },
          { status: 500 }
        );
      }
      membershipId = created.id;
    }

    // 2) Create Billplz bill
    let billId: string;
    let checkoutUrl: string;
    try {
      const result = await createBillplzBill({
        amountCents: planRow.price_cents,
        description: `Capital Bridge — ${planRow.name}`,
        email: user.email ?? "client@thecapitalbridge.com",
        name: user.email ?? "Capital Bridge Client",
        reference1: membershipId,
        redirectUrl: process.env.BILLPLZ_REDIRECT_URL ?? "https://platform.thecapitalbridge.com/dashboard",
      });
      billId = result.billId;
      checkoutUrl = result.checkoutUrl;
    } catch (err) {
      console.error("[api/billing/create] Billplz error:", err);
      return NextResponse.json(
        { error: "bill_creation_failed", detail: err instanceof Error ? err.message : "unknown" },
        { status: 502 }
      );
    }

    // 3) Attach bill to membership (payment record)
    const { error: payErr } = await svc.from("payments").upsert(
      {
        membership_id: membershipId,
        billplz_bill_id: billId,
        billplz_collection_id: process.env.BILLPLZ_COLLECTION_ID ?? null,
        status: "pending",
        amount_cents: planRow.price_cents,
      },
      { onConflict: "membership_id" }
    );

    if (payErr) {
      console.error("[api/billing/create] payment upsert failed:", payErr);
      return NextResponse.json(
        { error: "payment_record_failed", detail: payErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("[api/billing/create] unexpected error:", err);
    return NextResponse.json(
      { error: "server_error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

