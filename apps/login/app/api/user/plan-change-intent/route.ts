import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { decodeJwtPayload } from "@cb/shared/sessionFingerprint";

export const runtime = "nodejs";

/**
 * Foundation: record that the user wants to change plan (manual/admin follow-up only).
 * Does not process refunds or change plans automatically.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "missing_bearer_token" }, { status: 401 });
  }

  const payload = decodeJwtPayload(token);
  const sub = typeof payload?.sub === "string" ? payload.sub : null;
  if (!sub) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  let body: { note?: string };
  try {
    body = (await req.json()) as { note?: string };
  } catch {
    body = {};
  }

  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

  try {
    const svc = createServiceClient();
    const { data: mem } = await svc
      .schema("public")
      .from("memberships")
      .select("id, status")
      .eq("user_id", sub)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const hasActive = !!mem?.id;

    const { data: paid } = await svc
      .schema("public")
      .from("billing_sessions")
      .select("id, created_at")
      .eq("user_id", sub)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const recentPaid = !!paid?.id;

    if (!hasActive || !recentPaid) {
      return NextResponse.json({ ok: false, error: "not_eligible" }, { status: 400 });
    }

    const intentValue = note ? `user_requested|${note}` : "user_requested";

    const { error } = await svc
      .schema("public")
      .from("profiles")
      .upsert({ id: sub, plan_change_intent: intentValue }, { onConflict: "id" });

    if (error) {
      console.error("[plan-change-intent]", error.message);
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[plan-change-intent]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
