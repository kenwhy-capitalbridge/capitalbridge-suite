import type { createServiceClient } from "@cb/supabase/service";
import { sendOnboardingEmailAfterPayment } from "./billingRecoveryEmail";

type Svc = ReturnType<typeof createServiceClient>;

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

async function findUserIdByEmail(svc: Svc, email: string): Promise<string | null> {
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

export type AdminBillingRecoveryOk = {
  ok: true;
  idempotent?: boolean;
  bill_id: string;
  old_email: string | null;
  new_email: string;
  old_user_id: string;
  new_user_id: string;
  membership_id: string;
};

export type AdminBillingRecoveryErr = {
  ok: false;
  httpStatus: number;
  error: string;
  bill_id: string;
  new_email: string;
  old_email?: string | null;
  old_user_id?: string | null;
  membership_id?: string | null;
  new_user_id?: string | null;
  detail?: string;
};

export type AdminBillingRecoveryResult = AdminBillingRecoveryOk | AdminBillingRecoveryErr;

/**
 * Support/admin: reassign paid billing session + membership to `new_email` (same rules as user self-recovery, no signed token).
 */
export async function performAdminBillingEmailRecovery(
  svc: Svc,
  params: { billId: string; newEmail: string }
): Promise<AdminBillingRecoveryResult> {
  const billId = params.billId.trim();
  const newEmail = normalizeEmail(params.newEmail);

  if (!billId) {
    return { ok: false, httpStatus: 400, error: "missing_bill_id", bill_id: "", new_email: newEmail };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { ok: false, httpStatus: 400, error: "invalid_email", bill_id: billId, new_email: newEmail };
  }

  const { data: sessionRow, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, email, status, user_id, membership_id, bill_id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    return {
      ok: false,
      httpStatus: 404,
      error: "session_not_found",
      bill_id: billId,
      new_email: newEmail,
    };
  }

  if (sessionRow.status !== "paid") {
    return {
      ok: false,
      httpStatus: 400,
      error: "payment_not_confirmed",
      bill_id: billId,
      new_email: newEmail,
      old_email: sessionRow.email ? normalizeEmail(sessionRow.email) : null,
    };
  }

  if (!sessionRow.membership_id || !sessionRow.user_id) {
    return {
      ok: false,
      httpStatus: 400,
      error: "membership_not_ready",
      bill_id: billId,
      new_email: newEmail,
      old_email: sessionRow.email ? normalizeEmail(sessionRow.email) : null,
    };
  }

  const registeredEmail = sessionRow.email ? normalizeEmail(sessionRow.email) : null;
  const oldUserId = sessionRow.user_id as string;
  const membershipId = sessionRow.membership_id as string;

  const { data: membership, error: memErr } = await svc
    .schema("public")
    .from("memberships")
    .select("id, user_id, plan_id, status, billing_session_id")
    .eq("id", membershipId)
    .maybeSingle();

  if (memErr || !membership?.plan_id) {
    return {
      ok: false,
      httpStatus: 400,
      error: "membership_not_found",
      bill_id: billId,
      new_email: newEmail,
      old_email: registeredEmail,
      old_user_id: oldUserId,
      membership_id: membershipId,
    };
  }

  if (membership.user_id !== oldUserId) {
    return {
      ok: false,
      httpStatus: 409,
      error: "membership_state_conflict",
      bill_id: billId,
      new_email: newEmail,
      old_email: registeredEmail,
      old_user_id: oldUserId,
      membership_id: membershipId,
    };
  }

  const sessionPk = String(sessionRow.id);
  if (membership.billing_session_id != null && String(membership.billing_session_id) !== sessionPk) {
    return {
      ok: false,
      httpStatus: 409,
      error: "membership_session_mismatch",
      bill_id: billId,
      new_email: newEmail,
      old_email: registeredEmail,
      old_user_id: oldUserId,
      membership_id: membershipId,
    };
  }

  if (registeredEmail && newEmail === registeredEmail) {
    const authUid = await findUserIdByEmail(svc, newEmail);
    if (!authUid) {
      return {
        ok: false,
        httpStatus: 400,
        error: "email_user_not_found",
        bill_id: billId,
        new_email: newEmail,
        old_email: registeredEmail,
        old_user_id: oldUserId,
        membership_id: membershipId,
      };
    }
    if (authUid !== oldUserId) {
      return {
        ok: false,
        httpStatus: 409,
        error: "session_user_email_mismatch",
        bill_id: billId,
        new_email: newEmail,
        old_email: registeredEmail,
        old_user_id: oldUserId,
        membership_id: membershipId,
      };
    }
    try {
      await sendOnboardingEmailAfterPayment(svc, oldUserId, newEmail);
    } catch {
      return {
        ok: false,
        httpStatus: 500,
        error: "email_send_failed",
        bill_id: billId,
        new_email: newEmail,
        old_email: registeredEmail,
        old_user_id: oldUserId,
        membership_id: membershipId,
        new_user_id: oldUserId,
      };
    }
    return {
      ok: true,
      idempotent: true,
      bill_id: billId,
      old_email: registeredEmail,
      new_email: newEmail,
      old_user_id: oldUserId,
      new_user_id: oldUserId,
      membership_id: membershipId,
    };
  }

  const existingForNewEmail = await findUserIdByEmail(svc, newEmail);
  let targetUserId = existingForNewEmail;

  if (!targetUserId) {
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email: newEmail,
      email_confirm: true,
      user_metadata: { admin_billing_email_recovery: true, bill_id: billId },
    });
    if (createErr || !created.user?.id) {
      return {
        ok: false,
        httpStatus: 400,
        error: "create_user_failed",
        bill_id: billId,
        new_email: newEmail,
        old_email: registeredEmail,
        old_user_id: oldUserId,
        membership_id: membershipId,
        detail: createErr?.message ?? "unknown",
      };
    }
    targetUserId = created.user.id;
  }

  // Narrow type for TS
  if (!targetUserId) {
    return {
      ok: false,
      httpStatus: 500,
      error: "target_user_unresolved",
      bill_id: billId,
      new_email: newEmail,
      old_email: registeredEmail,
      old_user_id: oldUserId,
      membership_id: membershipId,
    };
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
    console.error(
      "[admin-recover-email] membership transfer failed",
      transferErr.message ?? String(transferErr)
    );
    return {
      ok: false,
      httpStatus: 500,
      error: "transfer_failed",
      bill_id: billId,
      new_email: newEmail,
      old_email: registeredEmail,
      old_user_id: oldUserId,
      membership_id: membershipId,
      new_user_id: targetUserId,
    };
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
      { id: targetUserId, email: newEmail },
      { onConflict: "id" }
    );

  try {
    await sendOnboardingEmailAfterPayment(svc, targetUserId, newEmail);
  } catch (e) {
    console.error(
      "[admin-recover-email] send email failed",
      e instanceof Error ? e.message : "unknown"
    );
    return {
      ok: false,
      httpStatus: 500,
      error: "email_send_failed",
      bill_id: billId,
      new_email: newEmail,
      old_email: registeredEmail,
      old_user_id: oldUserId,
      membership_id: membershipId,
      new_user_id: targetUserId,
    };
  }

  return {
    ok: true,
    bill_id: billId,
    old_email: registeredEmail,
    new_email: newEmail,
    old_user_id: oldUserId,
    new_user_id: targetUserId,
    membership_id: membershipId,
  };
}
