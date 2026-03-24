import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";

export const runtime = "nodejs";

/**
 * Revokes other refresh-token sessions; keeps the current JWT session.
 * Call after signInWithPassword with Authorization: Bearer <access_token>.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "missing_bearer_token" }, { status: 401 });
  }

  try {
    const svc = createServiceClient();
    const { error } = await svc.auth.admin.signOut(token, "others");
    if (error) {
      console.warn("[revoke-other-sessions]", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[revoke-other-sessions]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
