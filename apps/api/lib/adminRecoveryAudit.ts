import type { createServiceClient } from "@cb/supabase/service";

type Svc = ReturnType<typeof createServiceClient>;

export function getClientIpFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() ?? "unknown";
}

export type AdminRecoveryAuditInsert = {
  bill_id: string;
  old_email: string | null;
  new_email: string;
  old_user_id: string | null;
  new_user_id: string | null;
  membership_id: string | null;
  status: "completed" | "denied";
  error_code: string | null;
  performed_by_actor: string | null;
  client_ip: string | null;
};

/**
 * Persist support recovery attempts (success and failure) for compliance / traceability.
 */
export async function insertAdminRecoveryAuditRow(svc: Svc, row: AdminRecoveryAuditInsert): Promise<void> {
  const { error } = await svc.schema("public").from("admin_billing_email_recoveries").insert({
    bill_id: row.bill_id,
    old_email: row.old_email,
    new_email: row.new_email,
    old_user_id: row.old_user_id,
    new_user_id: row.new_user_id,
    membership_id: row.membership_id,
    status: row.status,
    error_code: row.error_code,
    performed_by_actor: row.performed_by_actor,
    client_ip: row.client_ip,
  });

  if (error) {
    console.error("[admin-recover-email] audit insert failed", error.message, {
      bill_id: row.bill_id,
      status: row.status,
    });
  }
}
