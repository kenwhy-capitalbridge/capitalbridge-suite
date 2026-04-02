import "server-only";

import { randomBytes } from "crypto";
import type { createServiceClient } from "@cb/supabase/service";

type Svc = ReturnType<typeof createServiceClient>;

type EnsureBillingSessionUserResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; error: string };

function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    const lastName = parts.pop() ?? "";
    return { firstName: parts.join(" "), lastName };
  }
  if (parts.length === 1) {
    return { firstName: parts[0] ?? "", lastName: "" };
  }
  return { firstName: "", lastName: "" };
}

export async function ensureBillingSessionUser(params: {
  svc: Svc;
  billingSessionId: string;
}): Promise<EnsureBillingSessionUserResult> {
  const { svc, billingSessionId } = params;

  const { data: sessionRow, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, user_id, email, bill_id")
    .eq("id", billingSessionId)
    .maybeSingle();

  if (sessionErr || !sessionRow?.id) {
    return { ok: false, error: sessionErr?.message ?? "billing_session_not_found" };
  }

  const sessionEmail = typeof sessionRow.email === "string" ? sessionRow.email.trim().toLowerCase() : "";
  if (!sessionEmail) {
    return { ok: false, error: "billing_session_missing_email" };
  }

  const existingUserId = typeof sessionRow.user_id === "string" ? sessionRow.user_id.trim() : "";
  if (existingUserId) {
    const { data: wrap, error: getUserErr } = await svc.auth.admin.getUserById(existingUserId);
    if (wrap?.user?.id) {
      return { ok: true, userId: wrap.user.id, email: sessionEmail };
    }
    return { ok: false, error: getUserErr?.message ?? "billing_session_user_missing" };
  }

  let firstName = "";
  let lastName = "";
  const billId = typeof sessionRow.bill_id === "string" ? sessionRow.bill_id.trim() : "";
  if (billId) {
    const { data: pendingBill } = await svc
      .schema("public")
      .from("pending_bills")
      .select("name")
      .eq("billplz_bill_id", billId)
      .maybeSingle();
    const split = splitName(typeof pendingBill?.name === "string" ? pendingBill.name : "");
    firstName = split.firstName;
    lastName = split.lastName;
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const tempPassword = randomBytes(28).toString("base64url");
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email: sessionEmail,
    password: tempPassword,
    email_confirm: false,
    user_metadata: {
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      ...(fullName ? { full_name: fullName, name: fullName } : {}),
      checkout_pending: false,
    },
  });

  if (createErr || !created.user?.id) {
    return { ok: false, error: createErr?.message ?? "billing_user_create_failed" };
  }

  const userId = created.user.id;
  const { error: profileErr } = await svc
    .schema("public")
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: sessionEmail,
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
      },
      { onConflict: "id" }
    );

  if (profileErr) {
    await svc.auth.admin.deleteUser(userId);
    return { ok: false, error: profileErr.message };
  }

  const { error: sessionLinkErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .update({
      user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", billingSessionId);

  if (sessionLinkErr) {
    await svc.schema("public").from("profiles").delete().eq("id", userId);
    await svc.auth.admin.deleteUser(userId);
    return { ok: false, error: sessionLinkErr.message };
  }

  return { ok: true, userId, email: sessionEmail };
}
