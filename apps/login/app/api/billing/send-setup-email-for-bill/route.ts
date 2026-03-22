import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { sendPasswordSetupEmailToUser } from "@/lib/sendPasswordSetupEmailServer";
import { allowSendSetupEmailForBill } from "@/lib/recoveryRateLimit";
import { getClientIp, isAllowedRecoveryOrigin, recoveryAudit } from "@/lib/recoveryAuditLog";

export const runtime = "nodejs";

function emailDomain(email: string): string {
  const i = email.indexOf("@");
  return i >= 0 ? email.slice(i + 1) : "unknown";
}

/**
 * Sends password-setup email to the email on `billing_sessions` for this bill_id
 * (same as post-payment onboarding). After wrong-email recovery, that row is updated —
 * this is the single source of truth so resends never use stale client state.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!isAllowedRecoveryOrigin(req)) {
    recoveryAudit("password_setup_bill_denied", { reason: "origin", ip });
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

  if (!allowSendSetupEmailForBill(billId, ip)) {
    recoveryAudit("password_setup_bill_rate_limited", { bill_id: billId, ip });
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let svc: ReturnType<typeof createServiceClient>;
  try {
    svc = createServiceClient();
  } catch {
    recoveryAudit("password_setup_bill_denied", { reason: "config", bill_id: billId });
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: sessionRow, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, email, status, user_id, membership_id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionErr || !sessionRow?.id) {
    recoveryAudit("password_setup_bill_denied", { reason: "session_not_found", bill_id: billId, ip });
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  let membershipStatus: string | null = null;
  if (sessionRow.membership_id) {
    const { data: membership } = await svc
      .schema("public")
      .from("memberships")
      .select("status")
      .eq("id", sessionRow.membership_id)
      .maybeSingle();
    membershipStatus = typeof membership?.status === "string" ? membership.status : null;
  }

  const paymentConfirmed = sessionRow.status === "paid" || membershipStatus === "active";
  if (!paymentConfirmed) {
    recoveryAudit("password_setup_bill_denied", {
      reason: "payment_not_confirmed",
      bill_id: billId,
      user_id: sessionRow.user_id ?? null,
      ip,
    });
    return NextResponse.json({ error: "payment_not_confirmed" }, { status: 400 });
  }

  const emailRaw = typeof sessionRow.email === "string" ? sessionRow.email.trim().toLowerCase() : "";
  const userId = sessionRow.user_id as string | null;
  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) || !userId) {
    recoveryAudit("password_setup_bill_denied", {
      reason: "missing_email_or_user",
      bill_id: billId,
      user_id: sessionRow.user_id ?? null,
      ip,
    });
    return NextResponse.json({ error: "session_not_ready" }, { status: 400 });
  }

  try {
    await sendPasswordSetupEmailToUser(svc, userId, emailRaw);
  } catch (e) {
    recoveryAudit("password_setup_bill_denied", {
      reason: "email_send_failed",
      bill_id: billId,
      user_id: userId,
      ip,
      email_domain: emailDomain(emailRaw),
      detail: e instanceof Error ? e.message : "unknown",
    });
    return NextResponse.json(
      { error: "email_send_failed", message: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }

  recoveryAudit("password_setup_bill_ok", {
    bill_id: billId,
    user_id: userId,
    ip,
    email_domain: emailDomain(emailRaw),
  });

  return NextResponse.json({ ok: true, delivery_email: emailRaw });
}
