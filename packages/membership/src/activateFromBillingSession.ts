import "server-only";
import { computeExpiry } from "@cb/advisory-graph/plans/expiry";
import { getPlanDuration, loadPlanMap } from "@cb/advisory-graph/plans/planMap";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivateMembershipResult =
  | { ok: true; membershipId: string; idempotent?: boolean }
  | { ok: false; error: string };

export async function activateMembershipFromPaidBillingSession(params: {
  svc: SupabaseClient;
  billingSessionId: string;
  userId: string;
}): Promise<ActivateMembershipResult> {
  const { svc, billingSessionId, userId } = params;

  const { data: sessionRow, error: sessionErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, status, user_id, plan_id, membership_id, email")
    .eq("id", billingSessionId)
    .maybeSingle();

  if (sessionErr || !sessionRow?.id) {
    return { ok: false, error: sessionErr?.message ?? "billing_session_not_found" };
  }

  if (sessionRow.membership_id) {
    return { ok: true, membershipId: String(sessionRow.membership_id), idempotent: true };
  }

  if (sessionRow.status !== "paid") {
    return { ok: false, error: "billing_session_not_paid" };
  }

  if (String(sessionRow.user_id) !== String(userId)) {
    return { ok: false, error: "billing_session_user_mismatch" };
  }

  const { data: planRow, error: planErr } = await svc
    .schema("public")
    .from("plans")
    .select("id, slug, duration_days, is_trial")
    .eq("id", sessionRow.plan_id)
    .maybeSingle();

  if (planErr || !planRow?.id) {
    return { ok: false, error: "plan_not_found" };
  }

  let durDays =
    planRow.duration_days != null ? Math.floor(Number(planRow.duration_days)) : planRow.is_trial ? 7 : 30;
  if (!Number.isFinite(durDays) || durDays < 1) {
    durDays = planRow.is_trial ? 7 : 30;
  }

  const start = new Date();
  const days = getPlanDuration(planRow.id, durDays);
  const exp = computeExpiry(start, days);
  const startIso = start.toISOString();
  const expIso = exp.toISOString();

  await svc
    .schema("public")
    .from("memberships")
    .update({
      status: "expired",
      expires_at: startIso,
      end_date: startIso,
      cancelled_at: startIso,
    })
    .eq("user_id", userId)
    .eq("status", "active");

  const { data: inserted, error: insErr } = await svc
    .schema("public")
    .from("memberships")
    .insert({
      user_id: userId,
      plan_id: planRow.id,
      status: "active",
      billing_session_id: billingSessionId,
      start_date: startIso,
      end_date: expIso,
      started_at: startIso,
      expires_at: expIso,
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id) {
    if (insErr?.code === "23505") {
      const { data: activeRow } = await svc
        .schema("public")
        .from("memberships")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (activeRow?.id) {
        return { ok: true, membershipId: String(activeRow.id), idempotent: true };
      }
    }
    console.error("[activate-membership] insert failed", insErr?.message);
    return { ok: false, error: insErr?.message ?? "membership_insert_failed" };
  }

  const membershipId = String(inserted.id);

  const { error: linkErr } = await svc
    .schema("public")
    .from("billing_sessions")
    .update({
      membership_id: membershipId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", billingSessionId);

  if (linkErr) {
    console.error("[activate-membership] link billing_session failed", linkErr.message);
    return { ok: false, error: linkErr.message };
  }

  const { data: linked } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("membership_id")
    .eq("id", billingSessionId)
    .maybeSingle();

  const linkedId = linked?.membership_id ? String(linked.membership_id) : null;
  if (linkedId && linkedId !== membershipId) {
    return { ok: true, membershipId: linkedId, idempotent: true };
  }

  await svc.schema("public").from("profiles").upsert({ id: userId }, { onConflict: "id" });

  return { ok: true, membershipId };
}

/**
 * Login-time self-heal: if user has no active membership but has a paid billing_session, create membership (idempotent).
 */
export async function ensurePaidMembershipForUser(
  svc: SupabaseClient,
  userId: string
): Promise<{ ok: boolean; ensured: number; errors: string[] }> {
  await loadPlanMap(svc);

  const { data: active } = await svc
    .schema("public")
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (active?.id) {
    return { ok: true, ensured: 0, errors: [] };
  }

  const { data: paid } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!paid?.id) {
    return { ok: true, ensured: 0, errors: [] };
  }

  const result = await activateMembershipFromPaidBillingSession({
    svc,
    billingSessionId: paid.id,
    userId,
  });

  if (!result.ok) {
    return { ok: false, ensured: 0, errors: [result.error] };
  }

  return { ok: true, ensured: 1, errors: [] };
}
