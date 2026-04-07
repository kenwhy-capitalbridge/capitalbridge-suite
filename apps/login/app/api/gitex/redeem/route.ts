import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import {
  GITEX_ACCESS_TYPE,
  GITEX_CAMPAIGN_TAG,
  normalizeGitexCouponCode,
} from "@cb/shared/gitexCampaign";
import { CHECKOUT_COUNTRIES, type MarketId } from "@cb/shared/markets";
import { PLATFORM_APP_URL } from "@cb/shared/urls";

export const dynamic = "force-dynamic";

const PAID_SLUGS = new Set(["monthly", "quarterly", "yearly", "strategic"]);

const ALLOWED_ADVISORY_MARKETS = new Set<MarketId>(CHECKOUT_COUNTRIES.map((c) => c.market));

function parseAdvisoryMarket(raw: unknown): MarketId | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().toUpperCase();
  return ALLOWED_ADVISORY_MARKETS.has(m as MarketId) ? (m as MarketId) : null;
}

type Body = {
  email?: string;
  couponCode?: string;
  advisoryMarket?: string;
};

function planSlugForCouponType(type: string): "gitex_7" | "gitex_14" {
  return type === "25" ? "gitex_14" : "gitex_7";
}

async function resolveOrCreateUserId(
  svc: ReturnType<typeof createServiceClient>,
  email: string
): Promise<{ userId: string } | { error: string }> {
  const { data: profileRow } = await svc
    .schema("public")
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (profileRow?.id) {
    return { userId: profileRow.id };
  }

  const tempPassword = randomBytes(32).toString("base64url");
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { campaign: GITEX_CAMPAIGN_TAG, source: "gitex_landing" },
  });

  if (created.user?.id) {
    const { error: profErr } = await svc.schema("public").from("profiles").upsert(
      { id: created.user.id, email },
      { onConflict: "id" }
    );
    if (profErr) {
      await svc.auth.admin.deleteUser(created.user.id);
      console.error("[gitex/redeem] profile upsert", profErr.message);
      return { error: "profile_create_failed" };
    }
    return { userId: created.user.id };
  }

  const msg = createErr?.message ?? "";
  if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
    const { data: again } = await svc
      .schema("public")
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (again?.id) return { userId: again.id };
  }

  console.error("[gitex/redeem] createUser", msg);
  return { error: "account_create_failed" };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const codeRaw = typeof body.couponCode === "string" ? body.couponCode : "";
  const couponCode = normalizeGitexCouponCode(codeRaw);
  const advisoryMarket = parseAdvisoryMarket(body.advisoryMarket);

  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!advisoryMarket) {
    return NextResponse.json({ error: "invalid_market" }, { status: 400 });
  }
  if (!couponCode || !couponCode.startsWith("CB-GITEX-")) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: row, error: fetchErr } = await svc
    .schema("public")
    .from("gitex_coupons")
    .select("id, type, is_used, expiry_date")
    .eq("code", couponCode)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  if (row.is_used) {
    return NextResponse.json({ error: "already_used" }, { status: 400 });
  }

  const expiry = String(row.expiry_date ?? "");
  if (expiry && today > expiry) {
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }

  const email = emailRaw.toLowerCase();

  const resolved = await resolveOrCreateUserId(svc, email);
  if ("error" in resolved) {
    const status = resolved.error === "profile_create_failed" ? 500 : 400;
    return NextResponse.json({ error: resolved.error }, { status });
  }
  const userId = resolved.userId;

  const { data: profileFlags } = await svc
    .schema("public")
    .from("profiles")
    .select("access_type")
    .eq("id", userId)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const { data: activeMem } = await svc
    .schema("public")
    .from("memberships")
    .select("plan_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${nowIso}`)
    .limit(1)
    .maybeSingle();

  if (activeMem?.plan_id) {
    const { data: planRow } = await svc
      .schema("public")
      .from("plans")
      .select("slug")
      .eq("id", activeMem.plan_id)
      .maybeSingle();
    const slug = String(planRow?.slug ?? "").toLowerCase();
    if (PAID_SLUGS.has(slug)) {
      return NextResponse.json({ error: "already_subscribed" }, { status: 400 });
    }
    if (profileFlags?.access_type === GITEX_ACCESS_TYPE && slug.startsWith("gitex_")) {
      return NextResponse.json({ error: "already_redeemed_gitex" }, { status: 400 });
    }
  }

  const planSlug = planSlugForCouponType(String(row.type));

  const { data: rpcData, error: rpcErr } = await svc.rpc("activate_membership", {
    user_email: email,
    plan_slug: planSlug,
    p_note: "GITEX2026 redeem",
  });

  if (rpcErr) {
    console.error("[gitex/redeem] activate_membership", rpcErr.message);
    return NextResponse.json({ error: "activation_failed" }, { status: 500 });
  }

  const rpc = rpcData as { ok?: boolean; error?: string; expires_at?: string } | null;
  if (!rpc?.ok) {
    console.error("[gitex/redeem] activate_membership rpc", rpc);
    return NextResponse.json({ error: rpc?.error ?? "activation_failed" }, { status: 400 });
  }

  const expiresAt = typeof rpc.expires_at === "string" ? rpc.expires_at : null;

  const { error: profileErr } = await svc
    .schema("public")
    .from("profiles")
    .update({
      access_type: GITEX_ACCESS_TYPE,
      campaign_source: GITEX_CAMPAIGN_TAG,
      campaign_trial_ends_at: expiresAt,
      email,
      advisory_market: advisoryMarket,
    })
    .eq("id", userId);

  if (profileErr) {
    console.error("[gitex/redeem] profile flags", profileErr.message);
  }

  const { error: couponErr } = await svc
    .schema("public")
    .from("gitex_coupons")
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
      used_by_user_id: userId,
    })
    .eq("id", row.id)
    .eq("is_used", false);

  if (couponErr) {
    console.error("[gitex/redeem] coupon update", couponErr.message);
    return NextResponse.json({ error: "coupon_lock_failed" }, { status: 500 });
  }

  await svc.schema("public").from("gitex_campaign_events").insert({
    event_type: "redeem",
    user_id: userId,
    coupon_id: row.id,
    meta: { plan_slug: planSlug, email, advisory_market: advisoryMarket },
  });

  const platformOrigin = PLATFORM_APP_URL.replace(/\/+$/, "");
  const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${platformOrigin}/` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error("[gitex/redeem] generateLink", linkErr?.message);
    return NextResponse.json(
      {
        ok: true,
        message: "Access activated. Sign in with your email to continue.",
        magicLink: null as string | null,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    ok: true,
    magicLink: linkData.properties.action_link,
    expiresAt,
  });
}
