import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { allowSetInitialPasswordForBill } from "@/lib/recoveryRateLimit";
import { getClientIp, isAllowedRecoveryOrigin, recoveryAudit } from "@/lib/recoveryAuditLog";

export const runtime = "nodejs";

function emailDomain(email: string): string {
  const i = email.indexOf("@");
  return i >= 0 ? email.slice(i + 1) : "unknown";
}

function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

/**
 * Sets the Supabase password for the user tied to a paid bill — no email link required.
 * Lets users finish onboarding on this device, then sign in from any browser with email + password.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!isAllowedRecoveryOrigin(req)) {
    recoveryAudit("password_set_bill_denied", { reason: "origin", ip });
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  let body: { bill_id?: unknown; password?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const billId = String(body.bill_id ?? "").trim();
  const password = typeof body.password === "string" ? body.password : "";

  if (!billId) {
    return NextResponse.json({ error: "missing_bill_id" }, { status: 400 });
  }

  if (!isValidPassword(password)) {
    return NextResponse.json(
      { error: "invalid_password", detail: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  if (!allowSetInitialPasswordForBill(billId, ip)) {
    recoveryAudit("password_set_bill_rate_limited", { bill_id: billId, ip });
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let svc: ReturnType<typeof createServiceClient>;
  try {
    svc = createServiceClient();
  } catch {
    recoveryAudit("password_set_bill_denied", { reason: "config", bill_id: billId });
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: sessionRow, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, email, status, user_id, membership_id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionErr || !sessionRow?.id) {
    recoveryAudit("password_set_bill_denied", { reason: "session_not_found", bill_id: billId, ip });
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
    recoveryAudit("password_set_bill_denied", {
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
    recoveryAudit("password_set_bill_denied", {
      reason: "missing_email_or_user",
      bill_id: billId,
      user_id: sessionRow.user_id ?? null,
      ip,
    });
    return NextResponse.json({ error: "session_not_ready" }, { status: 400 });
  }

  const { error: upErr } = await svc.auth.admin.updateUserById(userId, { password });

  if (upErr) {
    recoveryAudit("password_set_bill_denied", {
      reason: "update_failed",
      bill_id: billId,
      user_id: userId,
      ip,
      email_domain: emailDomain(emailRaw),
      detail: upErr.message?.slice(0, 200) ?? "unknown",
    });
    return NextResponse.json(
      { error: "password_update_failed", message: upErr.message ?? "Could not set password." },
      { status: 500 }
    );
  }

  recoveryAudit("password_set_bill_ok", {
    bill_id: billId,
    user_id: userId,
    ip,
    email_domain: emailDomain(emailRaw),
  });

  return NextResponse.json({ ok: true, email: emailRaw });
}
