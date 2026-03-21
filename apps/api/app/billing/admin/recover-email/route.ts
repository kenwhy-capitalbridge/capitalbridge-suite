import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";
import { requireBillingAdminSecret } from "@/lib/requireBillingAdminSecret";
import { getClientIpFromRequest, insertAdminRecoveryAuditRow } from "@/lib/adminRecoveryAudit";
import { performAdminBillingEmailRecovery } from "@/lib/performAdminBillingEmailRecovery";
import { allowAdminRecoverEmailByIp } from "@/lib/adminRecoverEmailRateLimit";

export const runtime = "nodejs";

/**
 * Support-only: reassign a paid checkout (bill_id) to a corrected email.
 * Auth: `Authorization: Bearer <BILLING_ADMIN_RECOVERY_SECRET>` (min 32 chars).
 * Not exposed to browsers — use curl or internal tooling only.
 *
 * Body: `{ "bill_id": string, "new_email": string, "performed_by"?: string }`
 */
export async function POST(req: Request) {
  const ip = getClientIpFromRequest(req);
  if (!allowAdminRecoverEmailByIp(ip)) {
    console.warn(
      JSON.stringify({
        event: "admin_billing_email_recovery",
        outcome: "rate_limited",
        client_ip: ip,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const auth = requireBillingAdminSecret(req);
  if (!auth.ok) {
    if (auth.reason === "misconfigured") {
      console.error("[admin-recover-email] BILLING_ADMIN_RECOVERY_SECRET missing or too short");
      return NextResponse.json({ error: "server_misconfigured" }, { status: 503 });
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { bill_id?: unknown; new_email?: unknown; performed_by?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const billId = String(body.bill_id ?? "").trim();
  const newEmailRaw = String(body.new_email ?? "");
  const performedBy =
    typeof body.performed_by === "string" && body.performed_by.trim()
      ? body.performed_by.trim().slice(0, 256)
      : null;

  let svc: ReturnType<typeof createServiceClient>;
  try {
    svc = createServiceClient();
  } catch (e) {
    console.error(
      "[admin-recover-email] service client",
      e instanceof Error ? e.message : "unknown"
    );
    return NextResponse.json({ error: "server_misconfigured" }, { status: 503 });
  }

  const result = await performAdminBillingEmailRecovery(svc, {
    billId,
    newEmail: newEmailRaw,
  });

  const ts = new Date().toISOString();
  const auditBase = {
    bill_id: result.bill_id || billId,
    new_email: result.new_email,
    old_email: result.ok ? result.old_email : (result.old_email ?? null),
    old_user_id: result.ok ? result.old_user_id : (result.old_user_id ?? null),
    new_user_id: result.ok ? result.new_user_id : (result.new_user_id ?? null),
    membership_id: result.ok ? result.membership_id : (result.membership_id ?? null),
    performed_by_actor: performedBy,
    client_ip: ip,
  };

  if (result.ok) {
    console.info(
      JSON.stringify({
        event: "admin_billing_email_recovery",
        outcome: "completed",
        timestamp: ts,
        bill_id: result.bill_id,
        old_email: result.old_email,
        new_email: result.new_email,
        idempotent: !!result.idempotent,
        performed_by: performedBy,
        client_ip: ip,
      })
    );
    await insertAdminRecoveryAuditRow(svc, {
      ...auditBase,
      status: "completed",
      error_code: null,
    });
    return NextResponse.json({
      ok: true,
      idempotent: !!result.idempotent,
      bill_id: result.bill_id,
      old_email: result.old_email,
      new_email: result.new_email,
    });
  }

  console.warn(
    JSON.stringify({
      event: "admin_billing_email_recovery",
      outcome: "denied",
      timestamp: ts,
      bill_id: result.bill_id,
      old_email: result.old_email ?? null,
      new_email: result.new_email,
      error: result.error,
      performed_by: performedBy,
      client_ip: ip,
    })
  );

  await insertAdminRecoveryAuditRow(svc, {
    ...auditBase,
    status: "denied",
    error_code: result.error,
  });

  const payload: Record<string, unknown> = { error: result.error };
  if (result.detail) payload.message = result.detail;

  return NextResponse.json(payload, { status: result.httpStatus });
}
