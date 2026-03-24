import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { ensurePaidMembershipForUser } from "@cb/membership/activateFromBillingSession";
import { decodeJwtPayload, getJwtSessionIdFromAccessToken } from "@cb/shared/sessionFingerprint";
import { allowCompleteLogin, RATE_LIMIT_MESSAGE } from "@/lib/authLoginRateLimit";
import { getClientIp } from "@/lib/recoveryAuditLog";
import { authEventLog } from "@/lib/authEventLog";

export const runtime = "nodejs";

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

const EMAIL_MISMATCH =
  "Please use the same email address you used during checkout.";

async function upsertActiveSession(
  svc: ReturnType<typeof createServiceClient>,
  userId: string,
  token: string
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const jwtSessionId = getJwtSessionIdFromAccessToken(token);
  const nowIso = new Date().toISOString();

  if (jwtSessionId) {
    const { error: upsertErr } = await svc.schema("public").from("user_active_session").upsert(
      {
        user_id: userId,
        session_id: jwtSessionId,
        updated_at: nowIso,
      },
      { onConflict: "user_id" }
    );

    if (upsertErr) {
      return { ok: false, detail: upsertErr.message };
    }
  } else {
    const { error: delErr } = await svc.schema("public").from("user_active_session").delete().eq("user_id", userId);
    if (delErr) {
      return { ok: false, detail: delErr.message };
    }
  }
  return { ok: true };
}

/**
 * After password sign-in: ensure paid membership, enforce payment email vs auth email, record user_active_session.
 * Retries critical steps once silently on transient failure.
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

  const ip = getClientIp(req);
  if (!allowCompleteLogin(sub, ip)) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  authEventLog("login_attempt", { user_id_prefix: sub.slice(0, 8) });

  const { data: userWrap, error: userErr } = await svc.auth.admin.getUserById(sub);
  if (userErr || !userWrap?.user?.id) {
    authEventLog("login_failed", { user_id_prefix: sub.slice(0, 8), reason: "invalid_user" });
    return NextResponse.json({ error: "invalid_token", detail: userErr?.message }, { status: 401 });
  }

  const userId = userWrap.user.id;
  const authEmail = normalizeEmail(userWrap.user.email ?? "");

  let paidRows: { email: string | null }[] | null = null;
  let paidErr: { message: string } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await svc
      .schema("public")
      .from("billing_sessions")
      .select("email")
      .eq("user_id", userId)
      .eq("status", "paid");
    paidRows = r.data as { email: string | null }[] | null;
    paidErr = r.error;
    if (!paidErr) break;
  }

  if (paidErr) {
    console.error("[complete-login] billing_sessions select failed", paidErr.message);
    return NextResponse.json({ error: "billing_lookup_failed" }, { status: 500 });
  }

  for (const r of paidRows ?? []) {
    const be = typeof r.email === "string" ? normalizeEmail(r.email) : "";
    if (be && authEmail && be !== authEmail) {
      authEventLog("email_mismatch", { user_id_prefix: userId.slice(0, 8) });
      return NextResponse.json({ error: "email_mismatch", message: EMAIL_MISMATCH }, { status: 403 });
    }
  }

  let ensure = await ensurePaidMembershipForUser(svc, userId);
  if (!ensure.ok) {
    ensure = await ensurePaidMembershipForUser(svc, userId);
  }

  if (!ensure.ok) {
    console.error("[complete-login] membership ensure failed", ensure.errors);
    authEventLog("login_failed", { user_id_prefix: userId.slice(0, 8), reason: "membership_ensure" });
    return NextResponse.json(
      { error: "membership_ensure_failed", detail: ensure.errors },
      { status: 500 }
    );
  }

  if (ensure.ensured > 0) {
    authEventLog("membership_self_healed", { user_id_prefix: userId.slice(0, 8), ensured: ensure.ensured });
  }

  let sessionResult = await upsertActiveSession(svc, userId, token);
  if (!sessionResult.ok) {
    sessionResult = await upsertActiveSession(svc, userId, token);
  }

  if (!sessionResult.ok) {
    console.error("[complete-login] user_active_session upsert failed", sessionResult.detail);
    return NextResponse.json({ error: "session_record_failed", detail: sessionResult.detail }, { status: 500 });
  }

  return NextResponse.json({ ok: true, membershipEnsured: ensure.ensured });
}
