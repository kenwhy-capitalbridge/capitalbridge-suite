import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/gitex/admin/coupons?used=0|1|all
 * Header: x-gitex-admin-secret: <GITEX_ADMIN_SECRET>
 *
 * Lists coupons for booth ops (optional; keep secret in env only).
 */
export async function GET(req: Request) {
  const secret = process.env.GITEX_ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const hdr = req.headers.get("x-gitex-admin-secret");
  if (hdr !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const used = new URL(req.url).searchParams.get("used");
  const svc = createServiceClient();
  let q = svc
    .schema("public")
    .from("gitex_coupons")
    .select("id, code, type, duration_days, is_used, used_at, used_by_user_id, expiry_date, campaign_tag, created_at")
    .order("created_at", { ascending: true });

  if (used === "0") q = q.eq("is_used", false);
  if (used === "1") q = q.eq("is_used", true);

  const { data, error } = await q;

  if (error) {
    console.error("[gitex/admin/coupons]", error.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  return NextResponse.json({ coupons: data ?? [] });
}
