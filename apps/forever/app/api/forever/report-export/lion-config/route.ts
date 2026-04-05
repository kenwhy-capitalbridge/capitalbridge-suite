import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import type { Tier } from "@cb/lion-verdict/copy";

import { ensureForeverReportLionConfig } from "@/lib/ensureForeverReportLionConfig";

export const dynamic = "force-dynamic";

const VERDICT_TIERS = new Set<string>(["STRONG", "STABLE", "FRAGILE", "AT_RISK", "NOT_SUSTAINABLE"]);

type PatchBody = {
  exportId?: string;
  lion_config?: Record<string, unknown>;
};

/**
 * PATCH `report_exports.lion_config` for the current user’s row (RLS + explicit ownership check).
 */
export async function PATCH(request: Request) {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const exportId = typeof body.exportId === "string" ? body.exportId.trim() : "";
  const lion_config = body.lion_config;
  if (!exportId || !lion_config || typeof lion_config !== "object" || Array.isArray(lion_config)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: row, error: selErr } = await supabase
    .from("report_exports")
    .select("user_id")
    .eq("id", exportId)
    .maybeSingle();

  if (selErr || !row || row.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error: upErr } = await supabase
    .from("report_exports")
    .update({ lion_config })
    .eq("id", exportId)
    .eq("user_id", user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

type PostBody = {
  exportId?: string;
  verdictTier?: string;
};

/**
 * ENSURE: populate paid `lion_config` Lion lines (anti-repeat) or return trial skip / existing choice.
 */
export async function POST(request: Request) {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const exportId = typeof body.exportId === "string" ? body.exportId.trim() : "";
  if (!exportId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: pre, error: preErr } = await supabase
    .from("report_exports")
    .select("tier, user_id")
    .eq("id", exportId)
    .maybeSingle();

  if (preErr || !pre || pre.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const isTrial = String(pre.tier ?? "").toLowerCase().trim() === "trial";
  if (isTrial) {
    return NextResponse.json({ ok: true, skipped: "trial", lion_config: null });
  }

  const verdictRaw = typeof body.verdictTier === "string" ? body.verdictTier.trim().toUpperCase() : "";
  if (!VERDICT_TIERS.has(verdictRaw)) {
    return NextResponse.json({ error: "bad_verdict_tier" }, { status: 400 });
  }

  try {
    const r = await ensureForeverReportLionConfig(supabase, {
      userId: user.id,
      exportId,
      verdictTier: verdictRaw as Tier,
    });
    return NextResponse.json(r);
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ error: err.message ?? "ensure_failed" }, { status: err.status ?? 500 });
  }
}

