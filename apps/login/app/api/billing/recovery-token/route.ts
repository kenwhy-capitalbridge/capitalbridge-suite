import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { RECOVERY_TOKEN_TTL_SEC, signRecoveryToken } from "@/lib/paymentRecoveryToken";
import { allowMintToken } from "@/lib/recoveryRateLimit";
import { getClientIp, isAllowedRecoveryOrigin, recoveryAudit } from "@/lib/recoveryAuditLog";

export const runtime = "nodejs";

/**
 * Mints a short-lived HMAC token for recover-correct-email. Tied to bill_id + billing_session_id server-side.
 * Does not expose internal UUIDs in the public billing status API.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!isAllowedRecoveryOrigin(req)) {
    recoveryAudit("token_mint_denied", { reason: "origin", ip });
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  let body: { bill_id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const billId = String(body.bill_id ?? "").trim();
  if (!billId) {
    return NextResponse.json({ error: "missing_bill_id" }, { status: 400 });
  }

  if (!allowMintToken(billId, ip)) {
    recoveryAudit("token_mint_rate_limited", { bill_id: billId, ip });
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let svc: ReturnType<typeof createServiceClient>;
  try {
    svc = createServiceClient();
  } catch (e) {
    recoveryAudit("token_mint_denied", { reason: "config", bill_id: billId });
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: sessionRow, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, status, membership_id, user_id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionErr || !sessionRow?.id) {
    recoveryAudit("token_mint_denied", { reason: "session_not_found", bill_id: billId, ip });
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  if (sessionRow.status !== "paid") {
    recoveryAudit("token_mint_denied", { reason: "not_paid", bill_id: billId, ip });
    return NextResponse.json({ error: "payment_not_confirmed" }, { status: 400 });
  }

  if (!sessionRow.membership_id || !sessionRow.user_id) {
    recoveryAudit("token_mint_denied", { reason: "membership_not_ready", bill_id: billId, ip });
    return NextResponse.json({ error: "membership_not_ready" }, { status: 400 });
  }

  try {
    const { token, exp } = signRecoveryToken(billId, String(sessionRow.id));
    recoveryAudit("token_mint_ok", { bill_id: billId, ip });
    return NextResponse.json({
      recovery_token: token,
      expires_in_sec: RECOVERY_TOKEN_TTL_SEC,
      expires_at_unix: exp,
    });
  } catch (e) {
    recoveryAudit("token_mint_denied", {
      reason: "sign_failed",
      bill_id: billId,
      detail: e instanceof Error ? e.message : "unknown",
    });
    return NextResponse.json({ error: "token_unavailable" }, { status: 500 });
  }
}
