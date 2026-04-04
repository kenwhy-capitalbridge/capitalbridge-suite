import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { createBillplzBill } from "@/lib/billplz";
import {
  computeMarketChangeDeltaSen,
  normalizeMarketId,
  type MarketId,
} from "@cb/shared/markets";

export const runtime = "nodejs";

type Body = { to_market?: string; preview_only?: boolean };

function redirectUrlForBillplz(): string {
  return process.env.BILLPLZ_REDIRECT_URL ?? "https://platform.thecapitalbridge.com/profile";
}

/**
 * Authenticated: change advisory region. If new regional price (same plan) is higher, creates a
 * Billplz bill for the MYR delta; otherwise updates profile immediately.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "unauthorized", detail: "missing_bearer_token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const previewOnly = body.preview_only === true;
  const toMarket = normalizeMarketId(typeof body.to_market === "string" ? body.to_market : "");

  const svc = createServiceClient();
  const {
    data: { user },
    error: userError,
  } = await svc.auth.getUser(token);

  if (userError || !user?.id) {
    return NextResponse.json({ error: "unauthorized", detail: userError?.message ?? "invalid_token" }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const { data: profile } = await svc
    .schema("public")
    .from("profiles")
    .select("advisory_market")
    .eq("id", user.id)
    .maybeSingle();

  const fromMarket: MarketId = normalizeMarketId(
    typeof profile?.advisory_market === "string" ? profile.advisory_market : null
  );

  const now = new Date().toISOString();
  const { data: membership } = await svc
    .schema("public")
    .from("memberships")
    .select("plan_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.plan_id) {
    return NextResponse.json({ error: "membership_required" }, { status: 403 });
  }

  const { data: planRow } = await svc
    .schema("public")
    .from("plans")
    .select("slug")
    .eq("id", membership.plan_id)
    .maybeSingle();

  const planSlug = typeof planRow?.slug === "string" ? planRow.slug : "monthly";

  if (toMarket === fromMarket) {
    return NextResponse.json({ error: "same_market" }, { status: 400 });
  }

  const deltaSen = computeMarketChangeDeltaSen(fromMarket, toMarket, planSlug);
  const deltaMyr = deltaSen / 100;

  if (previewOnly) {
    return NextResponse.json({
      ok: true as const,
      preview: true as const,
      from_market: fromMarket,
      to_market: toMarket,
      plan_slug: planSlug,
      delta_sen: deltaSen,
      delta_myr: deltaMyr,
      needs_payment: deltaSen > 0,
    });
  }

  if (deltaSen <= 0) {
    const { error: updErr } = await svc
      .schema("public")
      .from("profiles")
      .upsert(
        { id: user.id, email: user.email, advisory_market: toMarket },
        { onConflict: "id" }
      );
    if (updErr) {
      return NextResponse.json({ error: "update_failed", detail: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true as const, mode: "updated" as const, to_market: toMarket });
  }

  const { data: planFull } = await svc
    .schema("public")
    .from("plans")
    .select("id, slug, name")
    .eq("id", membership.plan_id)
    .maybeSingle();

  if (!planFull?.id) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 400 });
  }

  const checkoutMetadata: Record<string, string> = {
    intent: "market_change",
    from_market: fromMarket,
    to_market: toMarket,
    delta_sen: String(deltaSen),
    bill_amount_sen: String(deltaSen),
    bill_currency: "MYR",
    market: toMarket,
    plan_slug: planSlug,
  };

  const { data: newSession, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .insert({
      user_id: user.id,
      email: user.email,
      plan_id: planFull.id,
      plan: planFull.slug,
      status: "pending",
      payment_attempt_count: 1,
      updated_at: new Date().toISOString(),
      checkout_metadata: checkoutMetadata,
    })
    .select("id")
    .single();

  if (sessionErr || !newSession?.id) {
    console.error("[request-market-change] billing_sessions insert failed", sessionErr);
    return NextResponse.json(
      { error: "session_create_failed", detail: sessionErr?.message ?? "unknown" },
      { status: 500 }
    );
  }

  let billId: string;
  let checkoutUrl: string;
  try {
    const result = await createBillplzBill({
      amountCents: deltaSen,
      description: `Capital Bridge — regional advisory top-up (${fromMarket} → ${toMarket})`,
      email: user.email,
      name: user.email,
      reference1: newSession.id,
      redirectUrl: redirectUrlForBillplz(),
    });
    billId = result.billId;
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[request-market-change] Billplz error:", message);
    await svc.schema("public").from("billing_sessions").delete().eq("id", newSession.id);
    return NextResponse.json({ error: "bill_creation_failed", detail: message }, { status: 502 });
  }

  await svc
    .schema("public")
    .from("billing_sessions")
    .update({
      status: "bill_created",
      bill_id: billId,
      payment_url: checkoutUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", newSession.id);

  return NextResponse.json({
    ok: true as const,
    mode: "payment_required" as const,
    bill_id: billId,
    checkoutUrl,
    delta_sen: deltaSen,
    delta_myr: deltaMyr,
    from_market: fromMarket,
    to_market: toMarket,
  });
}
