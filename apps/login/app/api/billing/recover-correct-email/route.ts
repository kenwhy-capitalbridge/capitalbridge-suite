import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { sendPasswordSetupEmailToUser } from "@/lib/sendPasswordSetupEmailServer";
import { verifyRecoveryToken } from "@/lib/paymentRecoveryToken";
import { allowRecoverAttempt } from "@/lib/recoveryRateLimit";
import { getClientIp, isAllowedRecoveryOrigin, recoveryAudit } from "@/lib/recoveryAuditLog";

export const runtime = "nodejs";

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

function emailDomain(email: string): string {
  const i = email.indexOf("@");
  return i >= 0 ? email.slice(i + 1) : "unknown";
}

async function findUserIdByEmail(svc: ReturnType<typeof createServiceClient>, email: string): Promise<string | null> {
  const target = normalizeEmail(email);
  let page = 1;
  const maxPages = 50;
  while (page <= maxPages) {
    const { data: listData } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
    const u = listData?.users?.find((x) => normalizeEmail(x.email ?? "") === target);
    if (u?.id) return u.id;
    if (!listData?.users?.length || listData.users.length < 1000) break;
    page += 1;
  }
  return null;
}

/**
 * Wrong-email recovery: attach paid membership + billing session to the correct email user.
 * Requires a short-lived HMAC token minted via POST /api/billing/recovery-token (same origin).
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!isAllowedRecoveryOrigin(req)) {
    recoveryAudit("recover_denied", { reason: "origin", ip });
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  let body: { bill_id?: unknown; new_email?: unknown; recovery_token?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const billId = String(body.bill_id ?? "").trim();
  const newEmailRaw = String(body.new_email ?? "");
  const newEmail = normalizeEmail(newEmailRaw);
  const recoveryTokenRaw = String(body.recovery_token ?? "").trim();

  if (!billId) {
    return NextResponse.json({ error: "missing_bill_id" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!recoveryTokenRaw) {
    recoveryAudit("recover_denied", { reason: "missing_recovery_token", bill_id: billId, ip });
    return NextResponse.json({ error: "missing_recovery_token" }, { status: 400 });
  }

  const payload = verifyRecoveryToken(recoveryTokenRaw);
  if (!payload) {
    recoveryAudit("recover_token_invalid", { bill_id: billId, ip, new_email_domain: emailDomain(newEmail) });
    return NextResponse.json({ error: "invalid_recovery_token" }, { status: 403 });
  }

  if (payload.bid !== billId) {
    recoveryAudit("recover_mismatch", {
      kind: "bill_id_vs_token",
      bill_id: billId,
      ip,
      new_email_domain: emailDomain(newEmail),
    });
    return NextResponse.json({ error: "recovery_token_mismatch" }, { status: 403 });
  }

  if (!allowRecoverAttempt(billId, ip)) {
    recoveryAudit("recover_rate_limited", { bill_id: billId, ip });
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  recoveryAudit("recover_attempt", {
    bill_id: billId,
    ip,
    new_email_domain: emailDomain(newEmail),
  });

  let svc: ReturnType<typeof createServiceClient>;
  try {
    svc = createServiceClient();
  } catch (e) {
    recoveryAudit("recover_error", {
      reason: "config",
      bill_id: billId,
      detail: e instanceof Error ? e.message : "unknown",
    });
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: sessionRow, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, email, status, user_id, membership_id, bill_id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    recoveryAudit("recover_denied", { reason: "session_not_found", bill_id: billId, ip });
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  if (String(sessionRow.id) !== payload.sid) {
    recoveryAudit("recover_mismatch", {
      kind: "session_vs_token",
      bill_id: billId,
      ip,
      new_email_domain: emailDomain(newEmail),
    });
    return NextResponse.json({ error: "recovery_token_mismatch" }, { status: 403 });
  }

  if (sessionRow.status !== "paid") {
    recoveryAudit("recover_denied", { reason: "not_paid", bill_id: billId, ip });
    return NextResponse.json({ error: "payment_not_confirmed" }, { status: 400 });
  }

  if (!sessionRow.membership_id || !sessionRow.user_id) {
    recoveryAudit("recover_denied", { reason: "membership_not_ready", bill_id: billId, ip });
    return NextResponse.json({ error: "membership_not_ready" }, { status: 400 });
  }

  const registeredEmail = sessionRow.email ? normalizeEmail(sessionRow.email) : null;
  if (registeredEmail && newEmail === registeredEmail) {
    recoveryAudit("recover_denied", { reason: "same_as_registered", bill_id: billId, ip });
    return NextResponse.json({ error: "same_as_registered" }, { status: 400 });
  }

  const oldUserId = sessionRow.user_id as string;
  const membershipId = sessionRow.membership_id as string;

  const { data: membership, error: memErr } = await svc
    .schema("public")
    .from("memberships")
    .select("id, user_id, plan_id, status, billing_session_id")
    .eq("id", membershipId)
    .maybeSingle();

  if (memErr || !membership?.plan_id) {
    recoveryAudit("recover_denied", { reason: "membership_not_found", bill_id: billId, ip });
    return NextResponse.json({ error: "membership_not_found" }, { status: 400 });
  }

  if (membership.user_id !== oldUserId) {
    recoveryAudit("recover_mismatch", { kind: "membership_user", bill_id: billId, ip });
    return NextResponse.json({ error: "membership_state_conflict" }, { status: 409 });
  }

  const sessionPk = String(sessionRow.id);
  if (membership.billing_session_id != null && String(membership.billing_session_id) !== sessionPk) {
    recoveryAudit("recover_mismatch", { kind: "membership_session", bill_id: billId, ip });
    return NextResponse.json({ error: "membership_session_mismatch" }, { status: 409 });
  }

  const { data: paymentRow } = await svc
    .schema("public")
    .from("payments")
    .select("id, membership_id, billplz_bill_id")
    .eq("billplz_bill_id", billId)
    .maybeSingle();

  if (!paymentRow?.id) {
    recoveryAudit("recover_payment_missing", {
      bill_id: billId,
      ip,
      note: "continuing_with_session_only",
    });
  } else if (paymentRow.membership_id != null && String(paymentRow.membership_id) !== String(membershipId)) {
    recoveryAudit("recover_mismatch", { kind: "payment_membership", bill_id: billId, ip });
    return NextResponse.json({ error: "payment_membership_mismatch" }, { status: 409 });
  }

  let targetUserId = await findUserIdByEmail(svc, newEmail);

  if (!targetUserId) {
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email: newEmail,
      email_confirm: true,
      user_metadata: { payment_email_recovery: true, bill_id: billId },
    });
    if (createErr || !created.user?.id) {
      recoveryAudit("recover_denied", {
        reason: "create_user_failed",
        bill_id: billId,
        ip,
        detail: createErr?.message ?? "unknown",
      });
      return NextResponse.json(
        { error: "create_user_failed", message: createErr?.message ?? "unknown" },
        { status: 400 }
      );
    }
    targetUserId = created.user.id;
  }

  const planId = membership.plan_id as string;

  const now = new Date().toISOString();
  await svc
    .schema("public")
    .from("memberships")
    .update({
      status: "expired",
      expires_at: now,
      end_date: now,
      cancelled_at: now,
    })
    .eq("user_id", targetUserId)
    .eq("plan_id", planId)
    .eq("status", "active")
    .neq("id", membershipId);

  const { error: transferErr } = await svc
    .schema("public")
    .from("memberships")
    .update({ user_id: targetUserId })
    .eq("id", membershipId)
    .eq("user_id", oldUserId);

  if (transferErr) {
    recoveryAudit("recover_error", {
      reason: "transfer_failed",
      bill_id: billId,
      ip,
      detail: transferErr.message,
    });
    console.error("[recover-correct-email] membership transfer failed", transferErr);
    return NextResponse.json({ error: "transfer_failed", message: transferErr.message }, { status: 500 });
  }

  if (paymentRow?.id) {
    await svc.schema("public").from("payments").update({ user_id: targetUserId }).eq("billplz_bill_id", billId);
  }

  await svc
    .schema("public")
    .from("billing_sessions")
    .update({
      email: newEmail,
      user_id: targetUserId,
      updated_at: now,
    })
    .eq("bill_id", billId);

  await svc
    .schema("public")
    .from("profiles")
    .upsert(
      { id: targetUserId, email: newEmail, payment_status: "active", pending_plan: null },
      { onConflict: "id" }
    );

  try {
    await sendPasswordSetupEmailToUser(svc, targetUserId, newEmail);
  } catch (e) {
    recoveryAudit("recover_error", {
      reason: "email_send_failed",
      bill_id: billId,
      ip,
      detail: e instanceof Error ? e.message : "unknown",
    });
    console.error("[recover-correct-email] send email failed", e);
    return NextResponse.json(
      { error: "email_send_failed", message: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }

  recoveryAudit("recover_ok", { bill_id: billId, ip, new_email_domain: emailDomain(newEmail) });
  return NextResponse.json({ ok: true });
}
