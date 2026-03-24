import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { decodeJwtPayload } from "@cb/shared/sessionFingerprint";

export const runtime = "nodejs";

/**
 * Clears public.user_active_session for the authenticated user (logout cleanup).
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

  try {
    const svc = createServiceClient();
    const { error } = await svc.schema("public").from("user_active_session").delete().eq("user_id", sub);
    if (error) {
      console.error("[clear-active-session]", error.message);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[clear-active-session]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
