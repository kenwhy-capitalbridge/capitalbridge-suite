import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { decodeJwtPayload } from "@cb/shared/sessionFingerprint";
import { authEventLog } from "@/lib/authEventLog";

export const runtime = "nodejs";

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

const EMAIL_MISMATCH = "Please use the same email address you used during checkout.";

/**
 * Password setup (recovery session): block if auth email does not match paid billing_sessions.email.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "missing_bearer_token" }, { status: 401 });
  }

  const svc = createServiceClient();
  const payload = decodeJwtPayload(token);
  const sub = typeof payload?.sub === "string" ? payload.sub : null;
  if (!sub) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const { data: userWrap, error: userErr } = await svc.auth.admin.getUserById(sub);
  if (userErr || !userWrap?.user?.id) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const userId = userWrap.user.id;
  const authEmail = normalizeEmail(userWrap.user.email ?? "");

  const { data: paidRows, error: paidErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("email")
    .eq("user_id", userId)
    .eq("status", "paid");

  if (paidErr) {
    return NextResponse.json({ error: "billing_lookup_failed" }, { status: 500 });
  }

  for (const r of paidRows ?? []) {
    const be = typeof r.email === "string" ? normalizeEmail(r.email) : "";
    if (be && authEmail && be !== authEmail) {
      authEventLog("email_mismatch", { user_id_prefix: userId.slice(0, 8), context: "validate_payment_email" });
      return NextResponse.json({ ok: false, error: "email_mismatch", message: EMAIL_MISMATCH }, { status: 403 });
    }
  }

  return NextResponse.json({ ok: true });
}
