import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";

export const dynamic = "force-dynamic";

/** GET /api/gitex/admin/stats — header x-gitex-admin-secret */
export async function GET(req: Request) {
  const secret = process.env.GITEX_ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (req.headers.get("x-gitex-admin-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const { data: coupons, error: cErr } = await svc
    .schema("public")
    .from("gitex_coupons")
    .select("type, is_used");

  if (cErr) {
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const rows = coupons ?? [];
  const total = rows.length;
  const used = rows.filter((r) => r.is_used).length;
  const used15 = rows.filter((r) => r.is_used && r.type === "15").length;
  const used25 = rows.filter((r) => r.is_used && r.type === "25").length;

  const { count: redeemEvents } = await svc
    .schema("public")
    .from("gitex_campaign_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "redeem");

  return NextResponse.json({
    coupons_total: total,
    coupons_used: used,
    coupons_unused: total - used,
    redemptions_by_type_15: used15,
    redemptions_by_type_25: used25,
    redeem_events_count: typeof redeemEvents === "number" ? redeemEvents : null,
    note: "conversion_to_paid: track separately when billing marks upgrade from gitex (profiles.converted_from_gitex_at).",
  });
}
